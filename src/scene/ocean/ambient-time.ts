export const SECONDS_PER_AMBIENT_UNIT=190;
export function ambientTime(replaySeconds: number) {
  return replaySeconds / SECONDS_PER_AMBIENT_UNIT;
}
