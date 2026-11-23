import { deriveHrvSkyline } from "./skyline.ts";

export const RECORDED_REPLAY_PATH = "/api/replay/day";
export const REPLAY_INTERVAL_SECONDS = 300;

export type ReplayStream<T> = { status: "ready"; value: T } | { status: "failed" };
export type RecordedReplay = {
  date: string;
  timeZone: string;
  heartRate: ReplayStream<(number | null)[]>;
  cachedHeartRate?: boolean;
  hrv: ReplayStream<number | null>;
  calories: ReplayStream<(number | null)[]>;
  steps: ReplayStream<(number | null)[]>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validStream<T>(stream: unknown, valid: (value: unknown) => value is T): stream is ReplayStream<T> {
  return isRecord(stream) && (stream.status === "failed" || (stream.status === "ready" && valid(stream.value)));
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
  const heartRate = value.heartRate;
  return { date, timeZone, hrv, calories, steps, cachedHeartRate:value.cachedHeartRate === true,
    heartRate: validStream(heartRate, validTotals(false)) ? heartRate : {status:"failed"} };
}
