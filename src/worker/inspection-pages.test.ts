import { describe, expect, it } from "vitest";
import { mergeInspectionPages } from "../core/inspection-pages.ts";
import { createGoogleHealthClient } from "./google-health.ts";
import { dayWindow } from "./health-data.ts";

describe("Continuation for every core stream", () => {
  it.each(["daily-resting-heart-rate", "daily-heart-rate-variability", "total-calories", "steps", "heart-rate", "sleep", "exercise", "time-in-heart-rate-zone"])
  ("keeps pagination parameters for %s", async (key) => {
    let calls = 0;
    const client = createGoogleHealthClient(async (input, init) => {
      calls++;
      const url = new URL(String(input));
      expect(url.pathname).toContain(`/dataTypes/${key}/`);
      if (key === "total-calories" || key === "heart-rate") {
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toMatchObject({ pageToken: "next", windowSize: "300s" });
      } else expect(url.searchParams.get("pageToken")).toBe("next");
      return Response.json({});
    });
    expect((await client.streamPage("synthetic-access", dayWindow("2026-11-04", "America/Chicago")!, key, "next")).nextPageToken).toBe("");
    expect(calls).toBe(1);
  });

  it("retains separate daily methods and renumbers sessions across pages", () => {
    const page = { count: 1, notes: [], tables: [
      { title: "Sessions", columns: ["Session"], rows: [["Sleep 1"]] },
      { title: "Sleep 1: stages", columns: ["Stage"], rows: [["LIGHT"]] },
    ] };
    const result = mergeInspectionPages("sleep", page, page);
    expect(result.count).toBe(2);
    expect(result.tables[0]!.rows).toEqual([["Sleep 1"], ["Sleep 2"]]);
    expect(result.tables[2]!.title).toBe("Sleep 2: stages");
    expect(page.count).toBe(1);
  });
});


it("appends complete heart rate intervals and rejects cross-page duplicates without changing earlier results", () => {
  const current = { count: 1, notes: [], tables: [{ title: "Heart", columns: ["Start", "End", "Mean"],
    rows: [["2026-11-04T00:05:00Z", "2026-11-04T00:10:00Z", 81.25]] }] };
  const incoming = { ...current, tables: [{ ...current.tables[0]!, rows: [["2026-11-04T00:00:00Z", "2026-11-04T00:05:00Z", 62.4]] }] };
  const merged = mergeInspectionPages("heart-rate", current, incoming);
  expect(merged.tables[0]!.rows.map(row => row[2])).toEqual([62.4, 81.25]);
  expect(() => mergeInspectionPages("heart-rate", current, current)).toThrow("Duplicate");
  expect(current.tables[0]!.rows).toHaveLength(1);
});
