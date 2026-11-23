import { REPLAY_INTERVAL_SECONDS } from "../core/recorded-replay.ts";
import { calorieInterval, heartInterval, stepInterval } from "./health-data.ts";
import type { DayWindow } from "./health-data.ts";

export type ActivityStream = "total-calories" | "steps" | "heart-rate";

export function replayTotals(kind: ActivityStream, points: unknown[], window: DayWindow) {
  const start = Date.parse(window.start);
  const offset = (time: string) => {
    const millis = Date.parse(time) - start;
    const fraction = /\.\d{3}(\d+)Z$/.exec(time)?.[1];
    return (millis + (fraction ? Number("0." + fraction) : 0)) / 1000;
  };
  const duration = offset(window.end);
  const totals = new Array<number | null>(Math.ceil(duration / REPLAY_INTERVAL_SECONDS)).fill(null);
  const records = points.map(kind === "steps" ? stepInterval : kind === "heart-rate" ? heartInterval : calorieInterval)
    .map(record => ({ start: offset(record.start), end: offset(record.end), value: record.value }))
    .sort((a, b) => a.start - b.start);
  const uncertain = new Set<number>();
  let previousEnd = 0;
  for (const record of records) {
    if (record.start < previousEnd || record.start >= duration || (record.value !== null && record.value < 0)) {
      throw new Error("Invalid replay intervals.");
    }
    previousEnd = record.end;
    const first = Math.floor(record.start / REPLAY_INTERVAL_SECONDS);
    const end = Math.min(duration, (first + 1) * REPLAY_INTERVAL_SECONDS);
    if (kind !== "steps") {
      if (record.start !== first * REPLAY_INTERVAL_SECONDS || record.end !== end) {
        throw new Error("Unexpected rollup bucket boundaries.");
      }
      totals[first] = record.value;
    } else if (record.end > end) {
      // Reconciled intervals have no per-minute breakdown. Do not estimate a split.
      for (let i = first; i < totals.length && i * REPLAY_INTERVAL_SECONDS < record.end; i++) uncertain.add(i);
    } else {
      const sum = (totals[first] ?? 0) + record.value!;
      if (!Number.isSafeInteger(sum)) throw new Error("Invalid step total.");
      totals[first] = sum;
    }
  }
  for (const index of uncertain) totals[index] = null;
  return totals;
}
