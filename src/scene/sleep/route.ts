import { CubicBezierCurve3, CurvePath, LineCurve3, Vector3 } from "three";
import { OUTER_MOUTH, turningBasin, WORK_BOAT_BERTH } from "../city/harbor-plan.ts";
import type { Point } from "../loop-path.ts";

const [berthX, berthZ] = WORK_BOAT_BERTH.position;
const slip = 1.5;
const transitZ = berthZ + slip;
const slipped: Point = [berthX, transitZ];
export const JETTY_HEAD: Point = [1144, transitZ];
export type Maneuver = "path" | "hold" | "pivot" | "lateral";

function pose(x: number, z: number, yaw: number, maneuver: Maneuver) {
  const tx = Math.cos(yaw), tz = -Math.sin(yaw);
  return { x, z, tx, tz, nx: -tz, nz: tx, yaw, maneuver };
}

const vector = ([x,z]: Point) => new Vector3(x,0,z);
const line = (a: Point,b: Point) => new LineCurve3(vector(a),vector(b));
function bend(a: Point,b: Point,c: Point,d: Point) {
  const curve = new CubicBezierCurve3(vector(a),vector(b),vector(c),vector(d));
  curve.arcLengthDivisions = 512;
  return curve;
}

// Each leg has an east-west tangent at both ends.
function fairway(a: Point,b: Point) {
  const third = (b[0]-a[0])/3;
  return bend(a,[a[0]+third,a[1]],[b[0]-third,b[1]],b);
}
const outbound = new CurvePath<Vector3>();
outbound.add(line(slipped,OUTER_MOUTH.point));
export const S_MOUTH = slip + outbound.getLength();
const offshorePoints: Point[] = [OUTER_MOUTH.point,[390,-15],[600,12],[820,3],[1024,transitZ],JETTY_HEAD];
for (let i=1;i<offshorePoints.length;i++) outbound.add(fairway(offshorePoints[i-1]!,offshorePoints[i]!));
export const JETTY_SLIDE = 1;
export const ROUTE_LENGTH = slip + outbound.getLength() + JETTY_SLIDE;

function frameOn(path: CurvePath<Vector3>, distance: number) {
  const ends = path.getCurveLengths();
  let i=0;
  while (i<ends.length-1 && distance>ends[i]!) i++;
  const curve = path.curves[i]!;
  const u = Math.max(0,Math.min(1,(distance-(ends[i-1]??0))/curve.getLength()));
  const p = curve.getPointAt(u), tangent = curve.getTangentAt(u);
  return pose(p.x,p.z,-Math.atan2(tangent.z,tangent.x),"path");
}
export function routeFrame(distance: number) {
  const s = Math.max(0,Math.min(ROUTE_LENGTH,distance));
  const alongside=s-(ROUTE_LENGTH-JETTY_SLIDE);
  if(alongside>0)return pose(JETTY_HEAD[0],transitZ-alongside,0,"lateral");
  return s<slip ? pose(berthX,berthZ+s,0,"lateral") : frameOn(outbound,s-slip);
}

const inbound = new CurvePath<Vector3>();
const turnX = JETTY_HEAD[0]+45, radius = 74;
const handle = radius*4*(Math.SQRT2-1)/3;
const turnStart: Point = [turnX,transitZ], apex: Point = [turnX+radius,transitZ+radius];
const turnEnd: Point = [turnX,transitZ+2*radius];
inbound.add(line(JETTY_HEAD,turnStart));
inbound.add(bend(turnStart,[turnX+handle,transitZ],[apex[0],apex[1]-handle],apex));
inbound.add(bend(apex,[apex[0],apex[1]+handle],[turnX+handle,turnEnd[1]],turnEnd));
const mergeStart: Point = [420,turnEnd[1]];
inbound.add(line(turnEnd,mergeStart));
inbound.add(fairway(mergeStart,OUTER_MOUTH.point));
inbound.add(fairway(OUTER_MOUTH.point,turningBasin.center));
const approach = new CurvePath<Vector3>();
const parallelStart: Point = [berthX-25,transitZ];
approach.add(fairway(turningBasin.center,parallelStart));
approach.add(line(parallelStart,slipped));

const smooth = (u: number) => u*u*(3-2*u);
export const returnStops = {basinEntry:.60,basinExit:.87,alongside:.98};
export function returnFrame(fraction: number, seconds=3600) {
  const u = Math.max(0,Math.min(1,fraction));
  const pivot = Math.max(.27,Math.min(.49,342/seconds));
  const moving = (1-pivot)/.73;
  const basinEntry = returnStops.basinEntry*moving, basinExit = basinEntry+pivot;
  const alongside = 1-(1-returnStops.alongside)*moving;
  const castOff=.02*moving;
  if(u<castOff)return pose(JETTY_HEAD[0],transitZ-JETTY_SLIDE*(1-smooth(u/castOff)),0,"lateral");
  if (u<basinEntry) return frameOn(inbound,inbound.getLength()*smooth((u-castOff)/(basinEntry-castOff)));
  if (u<basinExit) return pose(...turningBasin.center,Math.PI*(1-smooth((u-basinEntry)/pivot)),"pivot");
  if (u<alongside) return frameOn(approach,approach.getLength()*smooth((u-basinExit)/(alongside-basinExit)));
  return pose(berthX,transitZ-slip*smooth((u-alongside)/(1-alongside)),0,"lateral");
}
