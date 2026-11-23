import { ROUTE_LENGTH, routeFrame } from "./sleep/route.ts";
import { SYNTHETIC_SESSION, asleepSeconds, elapsedSeconds } from "./sleep/session.ts";
import { voyageState } from "./sleep/timeline.ts";
export { departureDate, arrivalDate, departure, dayOffset } from "./sleep/session.ts";

export const asleepMinutes = asleepSeconds(SYNTHETIC_SESSION)/60;
export const sessionSeconds = elapsedSeconds(SYNTHETIC_SESSION);
export const wake = SYNTHETIC_SESSION.segments.find(s => s.stage==="AWAKE")!;
export const sailingPose = (progress: number) => routeFrame(progress*ROUTE_LENGTH);
export function voyage(offset: number|null,seconds: number) {
  const state = voyageState(SYNTHETIC_SESSION, offset===null?-1:seconds+offset);
  const {x,z,yaw,t} = state;
  const moored = state.phase==="moored" || state.phase==="harbor";
  return {x,z,yaw,t,progress:state.s/ROUTE_LENGTH,moored,
    stage:state.stage ?? (moored?"Harbor":state.phase==="arrived"?"At island":"Returning")};
}
