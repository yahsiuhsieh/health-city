import { MathUtils, Vector3 } from "three";

export const focusLabels = {
  world: "World", sleep: "Sleep", hrv: "HRV", heart: "Heart",
  rhr: "RHR", steps: "Steps", energy: "Energy",
} as const;
export type FocusTarget = keyof typeof focusLabels;

export interface CameraPose {
  target: Vector3;
  azimuth: number;
  polar: number;
  radius: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
  width: number;
}

const { clamp, lerp } = MathUtils;
const shortSweep = 25 * Math.PI / 180;
const cubic = (t: number) => t < .5 ? 4*t**3 : 1 - 4*(1-t)**3;
const shorterArc = (a: number, b: number) => Math.atan2(Math.sin(b-a), Math.cos(b-a));

export function startFlight(from: CameraPose, to: CameraPose, reduced: boolean) {
  const distance = from.target.distanceTo(to.target);
  const duration = reduced ? .25 : clamp(.9 + .35*Math.log2(1 + distance/50), .9, 1.8);
  const angle = shorterArc(from.azimuth, to.azimuth);
  const sweep = !reduced && Math.abs(angle) < shortSweep ? (Math.sign(angle) || 1)*shortSweep : 0;
  const pullBack = !reduced && distance > 1.5*Math.max(from.width, to.width);
  let cancelled = false;

  return {
    duration, reduced,
    cancel() { cancelled = true; },
    sample(seconds: number, live = to): CameraPose | null {
      if (cancelled) return null;
      const t = clamp(seconds/duration, 0, 1);
      if (t === 1) return live;

      const progress = cubic(t);
      const follow = cubic(clamp((t-.7)/.3, 0, 1));
      const destination = to.target.clone().lerp(live.target, follow);
      const startZoom = Math.log(from.zoom);
      const endZoom = lerp(Math.log(to.zoom), Math.log(live.zoom), follow);
      let logZoom = lerp(startZoom, endZoom, progress);
      if (pullBack) {
        const middle = Math.min(startZoom, endZoom) + Math.log(.7);
        logZoom = t < .5
          ? lerp(startZoom, middle, cubic(2*t))
          : lerp(middle, endZoom, cubic(2*t-1));
      }
      return {
        target: from.target.clone().lerp(destination, progress),
        azimuth: from.azimuth + progress*(angle + follow*shorterArc(to.azimuth, live.azimuth)) + sweep*Math.sin(Math.PI*progress),
        polar: lerp(from.polar, lerp(to.polar, live.polar, follow), progress),
        radius: lerp(from.radius, live.radius, progress),
        zoom: Math.exp(logZoom),
        width: lerp(from.width, live.width, progress),
        offsetX: lerp(from.offsetX, live.offsetX, progress),
        offsetY: lerp(from.offsetY, live.offsetY, progress),
      };
    },
  };
}
