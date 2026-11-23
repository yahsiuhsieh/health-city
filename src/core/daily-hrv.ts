import { deriveHrvSkyline } from "./skyline.ts";

export const DAILY_HRV_PATH = "/api/replay/daily-hrv";
export const REPLAY_ZONE = "America/Chicago";

export type HrvSource = "synthetic" | "google-health";
export type DailyHrv = { source: HrvSource; date: string; rmssdMs: number | null };
export type DailyHrvResponse = { hrv: DailyHrv; googleHealthEnabled: boolean };

export const EXAMPLE_HRV = new Map<string, number | null>([
  ["2026-11-15", 27.4],
  ["2026-11-14", 12.8],
  ["2026-11-13", 4.6],
  ["2026-11-12", null],
  ["2026-11-11", 103.7],
]);

export function parseDailyHrvResponse(value: unknown, source: HrvSource, date: string): DailyHrvResponse | null {
  if (!value || typeof value !== "object" || !("hrv" in value) || !("googleHealthEnabled" in value) ||
      typeof value.googleHealthEnabled !== "boolean") return null;
  const { hrv } = value;
  if (!hrv || typeof hrv !== "object" || !("source" in hrv) || !("date" in hrv) || !("rmssdMs" in hrv) ||
      hrv.source !== source || hrv.date !== date ||
      (hrv.rmssdMs !== null && (typeof hrv.rmssdMs !== "number" || deriveHrvSkyline(hrv.rmssdMs).status === "invalid"))) return null;
  return { hrv: { source, date, rmssdMs: hrv.rmssdMs }, googleHealthEnabled: value.googleHealthEnabled };
}
