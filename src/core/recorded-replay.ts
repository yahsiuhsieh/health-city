import { validRhrRecords, type RhrRecord } from "./rhr.ts";
import { Temporal } from "@js-temporal/polyfill";
import { SLEEP_STAGES, elapsedSeconds, sleepInstant } from "./sleep-replay.ts";
import type { SleepSession, SleepSpan } from "./sleep-replay.ts";
import { deriveHrvSkyline } from "./skyline.ts";

export const RECORDED_REPLAY_PATH = "/api/replay/day";
export const REPLAY_INTERVAL_SECONDS = 300;

export type ReplayStream<T> = { status: "ready"; value: T } | { status: "failed" };
export type RecordedReplay = {
  date: string;
  timeZone: string;
  heartRate: ReplayStream<(number | null)[]>;
  cachedHeartRate?: boolean;
  rhr: ReplayStream<RhrRecord[]>;
  hrv: ReplayStream<number | null>;
  calories: ReplayStream<(number | null)[]>;
  steps: ReplayStream<(number | null)[]>;
  sleep: ReplayStream<SleepSession[]>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validStream<T>(stream: unknown, valid: (value: unknown) => value is T): stream is ReplayStream<T> {
  return isRecord(stream) && (stream.status === "failed" || (stream.status === "ready" && valid(stream.value)));
}

function validSpan(value: unknown): value is SleepSpan {
  return isRecord(value) && typeof value.start === "number" && typeof value.end === "number" &&
    Number.isFinite(value.start) && Number.isFinite(value.end) && value.start >= 0 && value.end > value.start;
}

function validSleep(sessions: unknown, date: string, timeZone: string): sessions is SleepSession[] {
  if (!Array.isArray(sessions)) return false;
  const localDay = Temporal.PlainDate.from(date);
  const start = localDay.toZonedDateTime(timeZone).toInstant();
  const end = localDay.add({days: 1}).toZonedDateTime(timeZone).toInstant();
  const ids = new Set<string>();
  return sessions.every(session => {
    if (!isRecord(session) || typeof session.id !== "string" || !session.id || ids.has(session.id) ||
        typeof session.startTime !== "string" || !Array.isArray(session.segments) || !session.segments.length ||
        session.returnSeconds !== undefined) return false;
    ids.add(session.id);
    let previous = 0;
    for (const span of session.segments) {
      if (!isRecord(span) || !SLEEP_STAGES.some(stage => stage === span.stage) ||
          !validSpan(span) || span.start !== previous) return false;
      previous = span.end;
    }
    if (session.shortAwakenings !== undefined && (!Array.isArray(session.shortAwakenings) ||
        !session.shortAwakenings.every(span => validSpan(span) && span.end <= previous))) return false;
    try {
      const record = session as unknown as SleepSession;
      return Temporal.Instant.compare(sleepInstant(record, 0), end) < 0 &&
        Temporal.Instant.compare(sleepInstant(record, elapsedSeconds(record)), start) > 0;
    } catch {
      return false;
    }
  });
}

export function parseRecordedReplay(value: unknown, date: string, timeZone: string, durationSeconds: number): RecordedReplay | null {
  if (!isRecord(value) || value.date !== date || value.timeZone !== timeZone) return null;
  const count = Math.ceil(durationSeconds / REPLAY_INTERVAL_SECONDS);
  const validTotals = (integer: boolean) => (items: unknown): items is (number | null)[] =>
    Array.isArray(items) && items.length === count && items.every(item => item === null ||
      (typeof item === "number" && item >= 0 && (integer ? Number.isSafeInteger(item) : Number.isFinite(item))));
  const { hrv, calories, steps } = value;
  if (!validStream(hrv, (item): item is number | null => item === null ||
    (typeof item === "number" && deriveHrvSkyline(item).status === "available")) ||
    !validStream(calories, validTotals(false)) || !validStream(steps, validTotals(true))) return null;
  const {heartRate, sleep} = value;
  return { date, timeZone, rhr: validStream(value.rhr, validRhrRecords) ? value.rhr : {status:"failed"}, hrv, calories, steps, cachedHeartRate:value.cachedHeartRate === true,
    heartRate: validStream(heartRate, validTotals(false)) ? heartRate : {status:"failed"},
    sleep: validStream(sleep, (items): items is SleepSession[] => validSleep(items, date, timeZone)) ? sleep : {status:"failed"} };
}
