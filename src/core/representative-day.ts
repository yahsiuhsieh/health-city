import { Temporal } from "@js-temporal/polyfill";
import { REPLAY_ZONE } from "./daily-hrv.ts";

import { REPLAY_INTERVAL_SECONDS as INTERVAL_SECONDS } from "./recorded-replay.ts";
import { roundMeasurement } from "./measurement.ts";
export const STEPS_PER_FIGURE = 80;
export const HARBOR_FIGURE_LIMIT = 6;
export const KCAL_PER_MINUTE_PER_VEHICLE = 1.2;
export const HARBOR_VEHICLE_LIMIT = 4;

const syntheticRhr: Record<string, { bpm: number; method: string | null }[]> = {
  "2026-11-15": [{ bpm: 58, method: "WITH_SLEEP" }],
  "2026-11-14": [],
  "2026-11-13": [{ bpm: 60, method: "WITH_SLEEP" }, { bpm: 63, method: "ONLY_WITH_AWAKE_DATA" }],
  "2026-11-12": [{ bpm: 84, method: null }],
  "2026-11-11": [{ bpm: 56, method: "WITH_SLEEP" }],
};

type SyntheticPeriod = readonly [startHour: number, endHour: number, value: number | null];

function replayDay(date: string, observations?: { steps: readonly SyntheticPeriod[]; calories: readonly SyntheticPeriod[] }) {
  const zone = REPLAY_ZONE;
  const localDate = Temporal.PlainDate.from(date);
  const start = localDate.toZonedDateTime(zone);
  const end = start.add({ days: 1 });
  const durationSeconds = (end.epochMilliseconds - start.epochMilliseconds) / 1000;
  const sample = (periods: readonly SyntheticPeriod[], baseline: number, index: number) => {
    const local = start.add({ seconds: index * INTERVAL_SECONDS });
    const hour = local.hour + local.minute / 60;
    const period = periods.find(([from, until]) => from <= hour && hour < until);
    return period ? period[2] : baseline;
  };
  const intervalCount = Math.ceil(durationSeconds / INTERVAL_SECONDS);
  return {
    date,
    rhr: observations ? syntheticRhr[date] ?? [] : [],
    dateLabel: localDate.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    zone,
    durationSeconds,
    heartMeans:Array.from({length:intervalCount},(_,i)=>{
      if (!observations || (i>=120 && i<(date.endsWith("12")?170:124))) return null;
      const level=date.endsWith("13") ? 1 : 6;
      return roundMeasurement(68+level*Math.sin(i*.12)+level*Math.sin(i*.045)+
        (date.endsWith("13")?3:62)*Math.exp(-((i-193)**2)/60));
    }),
    stepTotals: Array.from({ length: intervalCount }, (_, index) => observations ? sample(observations.steps, 0, index) : null),
    calorieTotals: Array.from({ length: intervalCount }, (_, index) => observations ? sample(observations.calories, 5.5, index) : null),
    replayLabel(seconds: number) {
      if (seconds >= durationSeconds) return "24:00";
      return start.add({ seconds: Math.floor(seconds) }).toPlainTime().toString({ smallestUnit: "minute" });
    },
  };
}

function syntheticDay(date: string, steps: readonly SyntheticPeriod[], calories: readonly SyntheticPeriod[]) {
  return replayDay(date, { steps, calories });
}

export function lastEndedReplayDate() {
  return Temporal.Now.plainDateISO(REPLAY_ZONE).subtract({ days: 1 }).toString();
}

export function recordedReplayDay(date: string) {
  return replayDay(date);
}

export const SYNTHETIC_DAYS = [
  syntheticDay("2026-11-15", [[7, 11, 128], [11, 14, 435], [15, 16, null], [17, 20, 226]],
    [[7, 11, 10.5], [11, 14, 22.5], [15, 16, null], [17, 20, 15.5]]),
  syntheticDay("2026-11-14", [[8, 11, 55], [11, 14, 158], [17, 19, 260]],
    [[5, 6, 0], [8, 11, 7], [11, 14, 12.5], [17, 19, 18]]),
  syntheticDay("2026-11-13", [[8, 10, 89], [11, 14, 235], [17, 19, 40]],
    [[8, 10, 10.5], [11, 14, 14.5], [17, 19, 7]]),
  syntheticDay("2026-11-12", [[0, 8, null], [8, 11, 145], [11, 14, 320], [15, 24, null]],
    [[0, 7, null], [8, 11, 10.5], [11, 14, 19.5], [15, 24, null]]),
  syntheticDay("2026-11-11", [[7, 10, 105], [11, 14, 380]], [[7, 10, 11], [11, 14, 21]]),
] as const;

export type ReplayDay = ReturnType<typeof replayDay>;

function replayInterval(day: ReplayDay, seconds: number) {
  // At 24:00, keep the last interval from the selected date.
  const index = Math.min(Math.floor(seconds / INTERVAL_SECONDS), day.stepTotals.length - 1);
  return {
    index,
    startSeconds: index * INTERVAL_SECONDS,
    endSeconds: Math.min((index + 1) * INTERVAL_SECONDS, day.durationSeconds),
  };
}

export function stepsAt(day: ReplayDay, seconds: number) {
  const { index, startSeconds, endSeconds } = replayInterval(day, seconds);
  const steps = day.stepTotals[index] ?? null;
  const pedestrianCount = steps === null ? 0 : Math.min(HARBOR_FIGURE_LIMIT, Math.ceil(steps / STEPS_PER_FIGURE));
  return { steps, pedestrianCount, startSeconds, endSeconds };
}

export function trafficAt(day: ReplayDay, seconds: number) {
  const { index, startSeconds, endSeconds } = replayInterval(day, seconds);
  const totalKcal = roundMeasurement(day.calorieTotals[index] ?? null);
  const meanKcalPerMinute = totalKcal === null ? null : roundMeasurement(totalKcal / ((endSeconds - startSeconds) / 60));
  const vehicleCount = meanKcalPerMinute === null ? 0
    : Math.min(HARBOR_VEHICLE_LIMIT, Math.ceil(meanKcalPerMinute / KCAL_PER_MINUTE_PER_VEHICLE));
  return { totalKcal, meanKcalPerMinute, vehicleCount, startSeconds, endSeconds };
}

// These poses are art-review motion, not a sleep route or a health-data mapping.
// Absolute replay time makes seeking reversible without replaying earlier frames.
export function boatPose(seconds: number, moored = false) {
  const phase = seconds * Math.PI * 2 / 900;
  return {
    y: Math.sin(phase) * 0.055,
    roll: Math.sin(phase + 0.4) * 0.012 * (moored ? .5 : 1),
    pitch: Math.cos(phase * 0.7) * 0.006,
  };
}
