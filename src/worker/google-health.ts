import { Temporal } from "@js-temporal/polyfill";
import {emptyDay,rangeOf,type Metric} from "./metric-history.ts";
import {elapsedSeconds,sleepInstant} from "../core/sleep-replay.ts";
import { dailyRhrRecord, dailyHrvRmssd, inspectRecords, object } from "./health-data.ts";
import type { DayWindow, InspectionData } from "./health-data.ts";
import { replaySleep } from "./replay-sleep.ts";
import { replayTotals } from "./replay-activity.ts";
import type { ActivityStream } from "./replay-activity.ts";
import { deriveHrvSkyline } from "../core/skyline.ts";

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

const hrvStream = { key: "daily-heart-rate-variability", field: "daily_heart_rate_variability.date", title: "Heart rate variability", pageSize: 25 };
const streams = [
  { key: "daily-resting-heart-rate", field: "daily_resting_heart_rate.date", title: "Resting heart rate", pageSize: 25 },
  hrvStream,
  { key: "total-calories", field: "", title: "Total calories", pageSize: 1000 },
  { key: "steps", field: "steps.interval.start_time", title: "Steps", pageSize: 1000 },
  { key: "heart-rate", field: "", title: "Heart rate", pageSize: 1000 },
  { key: "sleep", field: "sleep.interval.end_time", title: "Sleep", pageSize: 25 },
  { key: "exercise", field: "exercise.interval.civil_start_time", title: "Exercise", pageSize: 25 },
  { key: "time-in-heart-rate-zone", field: "time_in_heart_rate_zone.interval.start_time", title: "Heart rate zones", pageSize: 1000 },
];

export function isInspectionStream(key: string): boolean {
  return streams.some((stream) => stream.key === key);
}

function pageRequest(stream: (typeof streams)[number], window: DayWindow, pageToken: string) {
  const rollup = stream.key === "total-calories" || stream.key === "heart-rate";
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

  async function readPage(stream: (typeof streams)[number], window: DayWindow, accessToken: string, pageToken: string, timeout = 10_000) {
    const request = pageRequest(stream, window, pageToken);
    const response = await read(request.url, accessToken, request.body, timeout);
    const points = response[request.field] === undefined ? [] : response[request.field];
    const nextPageToken = response.nextPageToken === undefined ? "" : response.nextPageToken;
    if (!Array.isArray(points) || points.length > stream.pageSize || typeof nextPageToken !== "string" ||
        (nextPageToken !== "" && nextPageToken === pageToken)) {
      throw new HealthCheckError("Google Health returned an invalid page.");
    }
    return { points, nextPageToken };
  }

  async function replayPoints(kind: ActivityStream | "sleep" | "daily-resting-heart-rate" | "daily-heart-rate-variability", accessToken: string, window: DayWindow, active: () => Promise<boolean>) {
    const stream = streams.find(item => item.key === kind)!;
    const points: unknown[] = [];
    const seen = new Set<string>();
    let token = "";
    const pageLimit = kind.startsWith("daily-") ? 3 : 5;
    for (let page = 0; page < pageLimit; page++) {
      if (!await active()) throw new HealthCheckError("Sign-in required.", true);
      const { points: records, nextPageToken } = await readPage(stream, window, accessToken, token, 5_000);
      points.push(...records);
      if (!nextPageToken) return points;
      if (seen.has(nextPageToken)) throw new HealthCheckError("Google Health returned a repeated page token.");
      seen.add(nextPageToken);
      token = nextPageToken;
    }
    throw new HealthCheckError("The replay stream did not complete.");
  }

  return {
    async readMetricRange(key:Metric,windows:DayWindow[],token:string,active:()=>Promise<boolean>){
      const range=rangeOf(windows);
      const kinds={rhr:"daily-resting-heart-rate",hrv:"daily-heart-rate-variability",heartRate:"heart-rate",calories:"total-calories",steps:"steps",sleep:"sleep"} as const;
      const records=await replayPoints(kinds[key],token,range,active);
      const days=windows.map(emptyDay);
      if(key==="hrv" || key==="rhr"){
        const groups=new Map<string,unknown[]>();
        for(const point of records){
          const daily=object(object(point)[key==="hrv"?"dailyHeartRateVariability":"dailyRestingHeartRate"]);
          const raw=object(daily.date);
          const date=Temporal.PlainDate.from({year:Number(raw.year),month:Number(raw.month),day:Number(raw.day)},{overflow:"reject"}).toString();
          if(date<range.date || date>=range.nextDate)throw new HealthCheckError("Unexpected daily record date.");
          const group=groups.get(date)??[];
          group.push(point);groups.set(date,group);
        }
        for(const day of days){
          const group=groups.get(day.date)??[];
          if(key==="rhr")day.rhr={status:"ready",value:group.map(p=>dailyRhrRecord(p,day.date))};
          else {
            if(group.length>1)throw new HealthCheckError("Google Health returned more than one daily HRV record.");
            const value=group.length?dailyHrvRmssd(group[0],day.date):null;
            if(deriveHrvSkyline(value).status==="invalid")throw new HealthCheckError("Invalid daily HRV value.");
            day.hrv={status:"ready",value};
          }
        }
      }else if(key==="sleep"){
        const sessions=replaySleep(records,{...range,start:Temporal.Instant.from(range.start).subtract({nanoseconds:1}).toString()});
        for(const [i,day] of days.entries()){
          const w=windows[i]!;
          day.sleep={status:"ready",value:sessions.filter(s=>
            Temporal.Instant.compare(s.startTime,w.end)<0 && Temporal.Instant.compare(sleepInstant(s,elapsedSeconds(s)),w.start)>=0)};
        }
      }else{
        const kind=key==="heartRate"?"heart-rate":key==="calories"?"total-calories":"steps";
        const totals=replayTotals(kind,records,range);
        for(const [i,day] of days.entries()){
          const w=windows[i]!,offset=(Date.parse(w.start)-Date.parse(range.start))/300000,count=(Date.parse(w.end)-Date.parse(w.start))/300000;
          day[key]={status:"ready",value:totals.slice(offset,offset+count)};
        }
      }
      return days;
    },
    async readDailyHrv(accessToken: string, window: DayWindow, active: () => Promise<boolean>): Promise<number | null> {
      let token = "";
      let record: number | null | undefined;
      const seen = new Set<string>();
      for (let page = 0; page < 3; page++) {
        if (!await active()) throw new HealthCheckError("Sign-in required.", true);
        const { points, nextPageToken } = await readPage(hrvStream, window, accessToken, token);
        for (const point of points) {
          if (record !== undefined) throw new HealthCheckError("Google Health returned more than one daily HRV record.");
          record = dailyHrvRmssd(point, window.date);
          if (deriveHrvSkyline(record).status === "invalid") throw new HealthCheckError("Google Health returned an invalid daily HRV value.");
        }
        if (nextPageToken === "") return record ?? null;
        if (seen.has(nextPageToken)) throw new HealthCheckError("Google Health returned a repeated page token.");
        seen.add(nextPageToken);
        token = nextPageToken;
      }
      throw new HealthCheckError("The daily HRV read did not complete.");
    },
    async readReplayActivity(kind: ActivityStream, accessToken: string, window: DayWindow, active: () => Promise<boolean>) {
      return replayTotals(kind, await replayPoints(kind, accessToken, window, active), window);
    },
    async readDailyRhr(accessToken: string, window: DayWindow, active: () => Promise<boolean>) {
      const points = await replayPoints("daily-resting-heart-rate", accessToken, window, active);
      return points.map(point => dailyRhrRecord(point, window.date));
    },
    async readReplaySleep(accessToken: string, window: DayWindow, active: () => Promise<boolean>) {
      return replaySleep(await replayPoints("sleep", accessToken, window, active), window);
    },
    async streamPage(accessToken: string, window: DayWindow, key: string, pageToken: string) {
      const stream = streams.find((item) => item.key === key);
      if (!stream) throw new HealthCheckError("Unknown health data stream.");
      const { points, nextPageToken } = await readPage(stream, window, accessToken, pageToken);
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
            const data = await readPage(stream, window, accessToken, pageToken, Math.max(1, Math.min(10_000, remaining)));
            points.push(...data.points);
            pageToken = data.nextPageToken;
            if (!pageToken) { complete = true; break; }
            if (tokens.has(pageToken)) throw new HealthCheckError("Google Health returned a repeated page token.");
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
