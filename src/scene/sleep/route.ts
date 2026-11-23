import { CatmullRomCurve3, Vector3 } from "three";
import { HARBOR_MOUTH, WORK_BOAT_BERTH } from "../city/harbor-plan.ts";

type Point = readonly [number, number];
export const PIER_HEAD: Point = [178,0];
const fairway: Point[] = [WORK_BOAT_BERTH.position,[13,-7.95],[22,-6],HARBOR_MOUTH.point];
function route(points: Point[]) {
  const curve = new CatmullRomCurve3(points.map(([x,z]) => new Vector3(x,0,z)));
  curve.arcLengthDivisions = (points.length-1)*256;
  return curve;
}
const outbound = route([...fairway,[52,-7],[84,2],[112,10],[140,4],[162,-.5],PIER_HEAD]);
// Approach the entrance from offshore to clear the northern breakwater.
const inbound = route([PIER_HEAD,[174,28],[115,38],[60,34],[42,13],[36,-3],...[...fairway].reverse()]);
// The city fairway gives a 174.45 m passage with the mouth at 19.63 m.
export const ROUTE_LENGTH = outbound.getLength();
export const S_MOUTH = outbound.getLengths()[3*256]!;
function frame(curve: CatmullRomCurve3, fraction: number) {
  const u = Math.max(0, Math.min(1,fraction));
  const {x,z} = curve.getPointAt(u), tangent = curve.getTangentAt(u);
  return {x,z,tx:tangent.x,tz:tangent.z,nx:-tangent.z,nz:tangent.x,yaw:-Math.atan2(tangent.z,tangent.x)};
}
export function routeFrame(s: number) { return frame(outbound,s/ROUTE_LENGTH); }
export function returnFrame(fraction: number) { return frame(inbound,fraction); }
