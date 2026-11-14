import { inspectRecords, object } from "./health-data.ts";
import type { DayWindow, InspectionData } from "./health-data.ts";

export type StreamCheck = {
  key: string; title: string; state: "complete" | "partial" | "failed" | "skipped";
  data: InspectionData | null; message: string | null;
  nextPageToken?: string;
};
export type HealthInspection = { window: DayWindow; checks: StreamCheck[] };

// Only fixed messages and HTTP status numbers can appear on the result page.
export class HealthCheckError extends Error {
  constructor(message: string, public stop = false) { super(message); }
}

const streams = [
  { key: "daily-resting-heart-rate", field: "daily_resting_heart_rate.date", title: "Resting heart rate", pageSize: 25 },
  { key: "daily-heart-rate-variability", field: "daily_heart_rate_variability.date", title: "Heart rate variability", pageSize: 25 },
  { key: "total-calories", field: "", title: "Total calories", pageSize: 1000 },
  { key: "steps", field: "steps.interval.start_time", title: "Steps", pageSize: 1000 },
  { key: "heart-rate", field: "heart_rate.sample_time.physical_time", title: "Heart rate", pageSize: 1000 },
  { key: "sleep", field: "sleep.interval.end_time", title: "Sleep", pageSize: 25 },
  { key: "exercise", field: "exercise.interval.civil_start_time", title: "Exercise", pageSize: 25 },
  { key: "time-in-heart-rate-zone", field: "time_in_heart_rate_zone.interval.start_time", title: "Heart rate zones", pageSize: 1000 },
];

export function isInspectionStream(key: string): boolean {
  return streams.some((stream) => stream.key === key);
}

function pageRequest(stream: (typeof streams)[number], window: DayWindow, pageToken: string) {
  const rollup = stream.key === "total-calories";
  const url = new URL(`https://health.googleapis.com/v4/users/me/dataTypes/${stream.key}/dataPoints:${rollup ? "rollUp" : "reconcile"}`);
  let body: object | undefined;
  if (rollup) {
    body = { range: { startTime: window.start, endTime: window.end }, windowSize: "300s", pageSize: stream.pageSize, ...(pageToken ? { pageToken } : {}) };
  } else {
    let start = stream.field.endsWith(".date") ? window.date : window.start;
    let end = stream.field.endsWith(".date") ? window.nextDate : window.end;
    if (stream.key === "sleep") end = window.following;
    if (stream.key === "exercise") { start = window.previousDate; end = window.nextDate; }
    url.searchParams.set("filter", `${stream.field} >= "${start}" AND ${stream.field} < "${end}"`);
    url.searchParams.set("pageSize", String(stream.pageSize));
    if (pageToken) url.searchParams.set("pageToken", pageToken);
  }
  return { url, body, field: rollup ? "rollupDataPoints" : "dataPoints" };
}

export function createGoogleHealthClient(fetcher: typeof fetch = fetch) {
  async function read(url: URL, accessToken: string, body?: object, timeout = 10_000): Promise<Record<string, unknown>> {
    let response: Response;
    try {
      response = await fetcher(url, {
        method: body ? "POST" : "GET", redirect: "manual", signal: AbortSignal.timeout(timeout),
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw new HealthCheckError("Google Health did not respond. Retry later.", true); }
    if (!response.ok) {
      if (response.status === 400) {
        const data: unknown = await response.json().catch(() => null);
        const error = data && typeof data === "object" && "error" in data ? data.error : null;
        const details = error && typeof error === "object" && "details" in error ? error.details : null;
        if (Array.isArray(details) && details.some((detail) => detail &&
            detail["@type"] === "type.googleapis.com/google.rpc.ErrorInfo" &&
            detail.domain === "health.googleapis.com" && detail.reason === "ACCOUNT_NOT_LINKED")) {
          throw new HealthCheckError("This Google Account is not linked to Google Health. Complete Google Health setup before another check.", true);
        }
      }
      if (response.status === 401) throw new HealthCheckError("Google authorization is no longer valid. Use Renew Google authorization below.", true);
      if (response.status === 403) throw new HealthCheckError("Google Health denied access. Check API enablement and the three read-only permissions.");
      if (response.status === 429) throw new HealthCheckError("Google Health reached a request limit. Wait before another check.", true);
      throw new HealthCheckError(`Google Health could not complete the request (HTTP ${response.status}).`);
    }
    return object(await response.json());
  }

  return {
    async streamPage(accessToken: string, window: DayWindow, key: string, pageToken: string) {
      const stream = streams.find((item) => item.key === key);
      if (!stream) throw new HealthCheckError("Unknown health data stream.");
      const request = pageRequest(stream, window, pageToken);
      const response = await read(request.url, accessToken, request.body);
      const points = response[request.field] ?? [];
      const nextPageToken = response.nextPageToken ?? "";
      if (!Array.isArray(points) || points.length > stream.pageSize || typeof nextPageToken !== "string" || nextPageToken === pageToken) {
        throw new HealthCheckError("Google Health returned an invalid continuation page.");
      }
      return { data: inspectRecords(key, points, window), nextPageToken };
    },
    async checkIdentity(accessToken: string): Promise<void> {
      const identity = await read(new URL("https://health.googleapis.com/v4/users/me/identity"), accessToken);
      if (typeof identity.healthUserId !== "string" || !/^[A-Za-z0-9-]{1,63}$/.test(identity.healthUserId)) {
        throw new HealthCheckError("Google Health returned an invalid account response.");
      }
    },
    async inspectAll(accessToken: string, window: DayWindow, active: () => Promise<boolean> = async () => true): Promise<HealthInspection> {
      const checks: StreamCheck[] = [];
      const deadline = Date.now() + 45_000;
      let stopped = false;
      for (const stream of streams) {
        if (stopped) {
          checks.push({ key: stream.key, title: stream.title, state: "skipped", data: null, message: "The check stopped before this request." });
          continue;
        }
        if (!await active()) throw new HealthCheckError("Sign-in required.", true);
        try {
          const points: unknown[] = [];
          const tokens = new Set<string>();
          let pageToken = "";
          let complete = false;
          for (let page = 0; page < 3; page++) {
            const remaining = deadline - Date.now();
            if (remaining <= 0) throw new HealthCheckError("The manual check reached its time limit. Remaining requests stopped.", true);
            const request = pageRequest(stream, window, pageToken);
            const data = await read(request.url, accessToken, request.body, Math.max(1, Math.min(10_000, remaining)));
            const rows = data[request.field] ?? [];
            if (!Array.isArray(rows) || rows.length > stream.pageSize ||
                (data.nextPageToken !== undefined && typeof data.nextPageToken !== "string")) throw new Error("Invalid Google Health page.");
            points.push(...rows);
            pageToken = data.nextPageToken as string | undefined ?? "";
            if (!pageToken) { complete = true; break; }
            if (tokens.has(pageToken)) throw new Error("Repeated Google Health page token.");
            tokens.add(pageToken);
          }
          checks.push({ key: stream.key, title: stream.title, state: complete ? "complete" : "partial",
            data: inspectRecords(stream.key, points, window), message: complete ? null : "Partial result: this stream reached the three-page limit.",
            ...(!complete ? { nextPageToken: pageToken } : {}) });
        } catch (error) {
          stopped = error instanceof HealthCheckError && error.stop;
          checks.push({ key: stream.key, title: stream.title, state: "failed", data: null,
            message: error instanceof HealthCheckError ? error.message : "Google Health returned an unexpected data format. No records from this stream appear." });
        }
      }
      return { window, checks };
    },
  };
}
