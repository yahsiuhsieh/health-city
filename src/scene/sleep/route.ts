import { CubicBezierCurve3, CurvePath, LineCurve3, Vector3 } from "three";
import { HARBOR_MOUTH, turningBasin, WORK_BOAT_BERTH } from "../city/harbor-plan.ts";
import type { Point } from "../loop-path.ts";

const [berthX, berthZ] = WORK_BOAT_BERTH.position;
const slip = 1.5;
const transitZ = berthZ + slip;
const slipped: Point = [berthX, transitZ];
const [mouthX,mouthZ] = HARBOR_MOUTH.point;
const offshore = (east:number,south:number):Point => [mouthX+east,mouthZ+south];
export const JETTY_HEAD = offshore(275,395);
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
// Replace each fairway corner with a tangent circular arc. A cubic per quadrant
// keeps the radius within 1% and uses the same distance lookup as the straight legs.
function roundedCourse(points:Point[],radius:number) {
  const path = new CurvePath<Vector3>();
  let start = points[0]!;
  for(let i=1;i<points.length-1;i++){
    const a=points[i-1]!, b=points[i]!, c=points[i+1]!;
    const entry=Math.atan2(b[1]-a[1],b[0]-a[0]), exit=Math.atan2(c[1]-b[1],c[0]-b[0]);
    const turn=Math.atan2(Math.sin(exit-entry),Math.cos(exit-entry));
    const trim=radius*Math.tan(Math.abs(turn)/2), sign=Math.sign(turn);
    let p:Point=[b[0]-trim*Math.cos(entry),b[1]-trim*Math.sin(entry)];
    if(Math.hypot(start[0]-p[0],start[1]-p[1])>1e-6)path.add(line(start,p));
    const count=Math.ceil(Math.abs(turn)/(Math.PI/2)),step=turn/count;
    const handle=4/3*radius*Math.tan(Math.abs(step)/4);
    for(let k=0;k<count;k++){
      const h=entry+k*step, t=h+step;
      const end:Point=[p[0]+sign*radius*(Math.sin(t)-Math.sin(h)),p[1]+sign*radius*(Math.cos(h)-Math.cos(t))];
      path.add(bend(p,[p[0]+handle*Math.cos(h),p[1]+handle*Math.sin(h)],
        [end[0]-handle*Math.cos(t),end[1]-handle*Math.sin(t)],end));
      p=end;
    }
    start=p;
  }
  const last=points.at(-1)!;
  if(Math.hypot(start[0]-last[0],start[1]-last[1])>1e-6)path.add(line(start,last));
  return path;
}
const outbound=new CurvePath<Vector3>();
outbound.add(line(slipped,HARBOR_MOUTH.point));
export const S_MOUTH = slip+outbound.getLength();
const offshoreCourse=roundedCourse([HARBOR_MOUTH.point, offshore(11,0), offshore(48,-5), offshore(294,-2), offshore(378,116),
  offshore(459,271), offshore(459,395), JETTY_HEAD],63);
for(const leg of offshoreCourse.curves)outbound.add(leg);
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
  if(alongside>0)return pose(JETTY_HEAD[0],JETTY_HEAD[1]-alongside,-Math.PI,"lateral");
  return s<slip ? pose(berthX,berthZ+s,0,"lateral") : frameOn(outbound,s-slip);
}

const arrivalLane=offshore(0,14);
const inbound=roundedCourse([JETTY_HEAD,offshore(218,395),offshore(145,455),offshore(42,455),offshore(20,260),
  offshore(103,132),offshore(74,14),arrivalLane],66);
inbound.add(fairway(arrivalLane,turningBasin.center));

// Two tangent arcs return the east-facing boat to the working quay.
const [cx,cz]=turningBasin.center;
const alignX=127;
const dx=alignX-cx,dz=transitZ-cz;
const approachRadius=(dx*dx+dz*dz)/(4*Math.abs(dz));
const cornerRun=(dx*dx-dz*dz)/(4*dx);
const approach=roundedCourse([turningBasin.center,[cx+dx/2-cornerRun,cz],
  [cx+dx/2+cornerRun,transitZ],[alignX,transitZ]],approachRadius);
approach.add(line([alignX,transitZ],slipped));
const smooth = (u: number) => u*u*(3-2*u);
export function returnStops(seconds: number) {
  const pivot = Math.max(.27,Math.min(.49,342/seconds));
  const moving = (1-pivot)/.73;
  const basinEntry = .60*moving;
  return { basinEntry, basinExit:basinEntry+pivot, alongside:1-.02*moving, castOff:.02*moving, pivot };
}
export function returnFrame(fraction: number, seconds=3600) {
  const u = Math.max(0,Math.min(1,fraction));
  const {basinEntry,basinExit,alongside,castOff,pivot}=returnStops(seconds);
  if(u<castOff)return pose(JETTY_HEAD[0],JETTY_HEAD[1]-JETTY_SLIDE*(1-smooth(u/castOff)),-Math.PI,"lateral");
  if (u<basinEntry) return frameOn(inbound,inbound.getLength()*smooth((u-castOff)/(basinEntry-castOff)));
  if (u<basinExit) return pose(...turningBasin.center,Math.PI*(1-smooth((u-basinEntry)/pivot)),"pivot");
  if (u<alongside) return frameOn(approach,approach.getLength()*smooth((u-basinExit)/(alongside-basinExit)));
  return pose(berthX,transitZ-slip*smooth((u-alongside)/(1-alongside)),0,"lateral");
}
