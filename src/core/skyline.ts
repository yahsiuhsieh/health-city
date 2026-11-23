const MS_PER_TOWER=5;
export const thresholdMs=(index:number)=>MS_PER_TOWER*(index+1);

export type HrvSkyline =
  | { status: "available"; rmssdMs: number; buildingCount: number }
  | { status: "unavailable" }
  | { status: "invalid"; rmssdMs: number };

export function deriveHrvSkyline(rmssdMs: number | null): HrvSkyline {
  if (rmssdMs === null) return { status: "unavailable" };
  if (!Number.isFinite(rmssdMs) || rmssdMs < 0) return { status: "invalid", rmssdMs };
  const buildingCount = Math.floor(rmssdMs / MS_PER_TOWER);
  if (!Number.isSafeInteger(buildingCount)) return { status: "invalid", rmssdMs };
  return { status: "available", rmssdMs, buildingCount };
}
