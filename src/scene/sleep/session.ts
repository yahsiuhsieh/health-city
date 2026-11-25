import type { SleepSession, SleepStage } from "../../core/sleep-replay.ts";
export { asleepSeconds, elapsedSeconds, isAsleep } from "../../core/sleep-replay.ts";
export type { DaySleepVoyage, SleepSession, SleepSegment, SleepSpan, SleepStage } from "../../core/sleep-replay.ts";

export const departureDate = "2026-11-11", arrivalDate = "2026-11-12", departure = 23 * 3600;
const intervals: [SleepStage, number][] = [
  ["LIGHT",60], ["DEEP",85], ["REM",40], ["LIGHT",55], ["AWAKE",8],
  ["LIGHT",52], ["DEEP",65], ["REM",50], ["LIGHT",35],
];
let elapsed = 0;
export const SYNTHETIC_SESSION: SleepSession = {
  id: "synthetic-sleep-2026-11-11", startTime: "2026-11-12T05:00:00Z",
  segments: intervals.map(([stage, minutes]) => {
    const start = elapsed;
    elapsed += minutes * 60;
    return {stage, start, end: elapsed};
  }),
};
