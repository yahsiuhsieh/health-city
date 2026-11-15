import { describe, expect, it, vi } from "vitest";
import { createGoogleHealthClient } from "./google-health.ts";
import { createGoogleClient } from "./google.ts";
import { dayWindow, inspectRecords } from "./health-data.ts";
import { healthCheckHtml } from "./health-check.ts";

const window = dayWindow("2024-02-29", "UTC")!;
const record = (beatsPerMinute = "61", method: string | null = "WITH_SLEEP") => ({
  dataPointName: "synthetic-private-source",
  dailyRestingHeartRate: { date: { year: 2024, month: 2, day: 29 }, beatsPerMinute,
    ...(method === null ? {} : { dailyRestingHeartRateMetadata: { calculationMethod: method } }) },
});

describe("Complete read-only health inspection", () => {
  it("uses IANA calendar days across leap dates, DST, and skipped dates", () => {
    expect(window.nextDate).toBe("2024-03-01");
    expect(window.previousDate).toBe("2024-02-28");
    for (const [date, hours] of [["2026-03-08", 23], ["2026-11-01", 25]] as const) {
      const range = dayWindow(date, "America/Chicago")!;
      expect((Date.parse(range.end) - Date.parse(range.start)) / 3_600_000).toBe(hours);
    }
    expect(dayWindow("2011-12-30", "Pacific/Apia")).toBeNull();
    for (const [date, zone] of [["2026-02-29", "UTC"], ["2024-04-31", "UTC"], ["2024-02-29", "not-a-zone"], ["2024-02-29", "+08:00"]]) {
      expect(dayWindow(date!, zone!)).toBeNull();
    }
  });

  it("reads eight streams with snake-case filters, fixed destinations, and a read-only calorie POST", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input));
      expect(url.origin).toBe("https://health.googleapis.com");
      expect(init?.redirect).toBe("manual");
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer synthetic-access");
      const kind = url.pathname.split("/")[5];
      if (kind === "total-calories") {
        expect(init?.method).toBe("POST");
        expect(url.pathname).toMatch(/:rollUp$/);
        expect(JSON.parse(String(init?.body))).toEqual({ range: { startTime: window.start, endTime: window.end }, windowSize: "300s", pageSize: 1000 });
      } else {
        expect(init?.method).toBe("GET");
        expect(url.searchParams.get("filter")).not.toMatch(/[a-z][A-Z]/);
      }
      if (kind !== "daily-resting-heart-rate") return Response.json({});
      expect(url.searchParams.get("filter")).toBe('daily_resting_heart_rate.date >= "2024-02-29" AND daily_resting_heart_rate.date < "2024-03-01"');
      return Response.json(url.searchParams.has("pageToken") ? { dataPoints: [record("62", null)] }
        : { dataPoints: [record("61", "FUTURE_METHOD")], nextPageToken: "synthetic-page" });
    });
    const result = await createGoogleHealthClient(fetcher).inspectAll("synthetic-access", window);
    expect(result.checks).toHaveLength(8);
    expect(result.checks.every((check) => check.state === "complete")).toBe(true);
    expect(result.checks[0]!.data!.tables[0]!.rows).toEqual([[window.date, 61, "FUTURE_METHOD"], [window.date, 62, null]]);
    expect(fetcher).toHaveBeenCalledTimes(9);
    const html = healthCheckHtml(window.date, "UTC", result);
    expect(html).not.toContain("synthetic-private-source");
    expect(html).not.toContain("synthetic-access");
  });

  it.each([{ dataPoints: {} }, { nextPageToken: 42 }, { nextPageToken: null }, { dataPoints: Array(26).fill({}) }])
  ("rejects malformed pages in initial and continuation reads (%j)", async (page) => {
    const client = createGoogleHealthClient(async () => Response.json(page));
    const initial = await client.inspectAll("synthetic-access", window);
    expect(initial.checks[0]!.state).toBe("failed");
    expect(initial.checks[0]!.message).toBe("Google Health returned an invalid page.");
    await expect(client.streamPage("synthetic-access", window, "daily-resting-heart-rate", "cursor"))
      .rejects.toThrow("Google Health returned an invalid page.");
  });

  it("rejects repeated cursors in initial and continuation reads", async () => {
    const client = createGoogleHealthClient(async () => Response.json({ nextPageToken: "cursor" }));
    expect((await client.inspectAll("synthetic-access", window)).checks[0]!.state).toBe("failed");
    await expect(client.streamPage("synthetic-access", window, "steps", "cursor")).rejects.toThrow("invalid page");
  });

  it("bounds each stream to three pages without declaring a partial read complete", async () => {
    let calls = 0;
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ nextPageToken: `page-${++calls}` }));
    const result = await createGoogleHealthClient(fetcher).inspectAll("synthetic-access", window);
    expect(fetcher).toHaveBeenCalledTimes(24);
    expect(result.checks.every((check) => check.state === "partial")).toBe(true);
  });

  it("preserves earlier results and skips remaining streams after a quota error", async () => {
    let calls = 0;
    const fetcher = vi.fn<typeof fetch>(async () => ++calls === 1 ? Response.json({ dataPoints: [record()] })
      : Response.json({ message: "synthetic-private-detail" }, { status: 429 }));
    const result = await createGoogleHealthClient(fetcher).inspectAll("synthetic-access", window);
    expect(result.checks.map((check) => check.state)).toEqual(["complete", "failed", ...Array(6).fill("skipped")]);
    expect(result.checks[0]!.data!.count).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(healthCheckHtml(window.date, "UTC", result)).not.toContain("synthetic-private-detail");
  });

  it("isolates malformed records and permission failures instead of reporting missing data", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => String(input).includes("/daily-resting-heart-rate/")
      ? Response.json({ dataPoints: [record("9007199254740993")] }) : Response.json({}, { status: 403 }));
    const result = await createGoogleHealthClient(fetcher).inspectAll("synthetic-access", window);
    expect(result.checks.every((check) => check.state === "failed" && check.data === null)).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(8);
  });

  it("stops before any data call when the owner session is no longer active", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(createGoogleHealthClient(fetcher).inspectAll("synthetic-access", window, async () => false)).rejects.toThrow("Sign-in required");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps zero calories distinct from unavailable buckets", () => {
    const data = inspectRecords("total-calories", [
      { startTime: window.start, endTime: "2024-02-29T00:05:00Z", totalCalories: { kcalSum: 0 } },
      { startTime: "2024-02-29T00:05:00Z", endTime: "2024-02-29T00:10:00Z" },
    ], window);
    expect(data.tables[0]!.rows.map((row) => row[2])).toEqual([0, null]);
  });

  it("derives sample means with counts and leaves empty intervals unavailable", () => {
    const data = inspectRecords("heart-rate", [60, 80].map((bpm, index) => ({ heartRate: {
      sampleTime: { physicalTime: `2024-02-29T00:0${index}:00Z` }, beatsPerMinute: String(bpm),
    } })), window);
    expect(data.tables[0]!.rows).toHaveLength(288);
    expect(data.tables[0]!.rows[0]!.slice(2, 4)).toEqual([70, 2]);
    expect(data.tables[0]!.rows[1]!.slice(2, 4)).toEqual([null, 0]);
  });

  it("preserves whole cross-midnight sleep and overlapping short awakenings separately", () => {
    const span = { startTime: "2024-02-28T23:00:00Z", endTime: "2024-02-29T07:00:00Z" };
    const data = inspectRecords("sleep", [{ sleep: { interval: span, type: "STAGES", stages: [{ ...span, type: "LIGHT" }],
      shortAwakenings: [{ startTime: "2024-02-29T01:00:00Z", endTime: "2024-02-29T01:01:00Z", type: "AWAKE" }] } }], window);
    expect(data.count).toBe(1);
    expect(data.tables[0]!.rows[0]!.slice(1, 3)).toEqual([span.startTime, span.endTime]);
    expect(data.tables[1]!.rows).toHaveLength(1);
    expect(data.tables[2]!.rows).toHaveLength(1);
  });

  it("retains exercise completion, pause events, active time, and absent zone values", () => {
    const data = inspectRecords("exercise", [{ exercise: {
      interval: { startTime: "2024-02-28T23:30:00Z", endTime: "2024-02-29T00:30:00Z" },
      exerciseType: "WALKING", activeDuration: "3000s", metricsSummary: { heartRateZoneDurations: { vigorousTime: "120s" } },
      exerciseEvents: [{ eventTime: "2024-02-29T00:00:00Z", type: "PAUSE" }],
    } }], window);
    expect(data.count).toBe(1);
    expect(data.tables[0]!.rows[0]!.slice(2)).toEqual(["2024-02-29T00:30:00Z", "WALKING", 3000, 120, null]);
    expect(data.tables[1]!.rows).toEqual([["2024-02-29T00:00:00Z", "PAUSE"]]);
  });

  it.each([302, 401, 403, 429, 503])("does not follow redirects or retry identity errors (%s)", async (status) => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ private: "synthetic-private-detail" }, { status, headers: { Location: "https://unexpected.test" } }));
    await expect(createGoogleHealthClient(fetcher).checkIdentity("synthetic-access")).rejects.not.toThrow("synthetic-private-detail");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reports unlinked accounts without using provider messages or setup URLs", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ error: { message: "synthetic-private-detail", details: [{
      "@type": "type.googleapis.com/google.rpc.ErrorInfo", domain: "health.googleapis.com", reason: "ACCOUNT_NOT_LINKED",
    }] } }, { status: 400 }));
    await expect(createGoogleHealthClient(fetcher).checkIdentity("synthetic-access")).rejects.toThrow("not linked to Google Health");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([{ access_token: "" }, { access_token: "synthetic\r\ntoken" }, { token_type: "Other" }, { expires_in: 0 }, { scope: "openid email" }])
  ("rejects unusable refreshed credentials (%j)", async (fields) => {
    const google = createGoogleClient(async () => Response.json({ access_token: "synthetic-access", token_type: "Bearer", expires_in: 3600, ...fields }));
    await expect(google.refresh("synthetic-refresh", { clientId: "test", clientSecret: "synthetic-secret" })).rejects.toThrow();
  });
});
