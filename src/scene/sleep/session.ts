export type SleepStage = "LIGHT" | "DEEP" | "REM" | "AWAKE" | "ASLEEP";
export interface SleepSegment { stage: SleepStage; start: number; end: number }
export interface SleepSession {
  id: string;
  startDate: string;
  endDate: string;
  startSecondOfDay: number;
  segments: SleepSegment[];
}

export const departureDate = "2026-11-11", arrivalDate = "2026-11-12", departure = 23 * 3600;
const intervals: [SleepStage, number][] = [
  ["LIGHT",60], ["DEEP",85], ["REM",40], ["LIGHT",55], ["AWAKE",8],
  ["LIGHT",52], ["DEEP",65], ["REM",50], ["LIGHT",35],
];
let elapsed = 0;
export const SYNTHETIC_SESSION: SleepSession = {
  id: "synthetic-sleep-2026-11-11", startDate: departureDate, endDate: arrivalDate, startSecondOfDay: departure,
  segments: intervals.map(([stage, minutes]) => {
    const start = elapsed;
    elapsed += minutes * 60;
    return {stage, start, end: elapsed};
  }),
};
export function asleepSeconds(session: SleepSession) {
  return session.segments.reduce((sum, segment) => sum + (segment.stage === "AWAKE" ? 0 : segment.end - segment.start), 0);
}
export function elapsedSeconds(session: SleepSession) { return session.segments.at(-1)?.end ?? 0; }
export function dayOffset(date: string, example: boolean) {
  if (!example) return null;
  if (date === departureDate) return -departure;
  return date === arrivalDate ? 86400 - departure : null;
}
