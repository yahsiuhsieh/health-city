import { ambientTime } from "./ambient-time.ts";
import { HARBOR_MOUTH } from "../city/harbor-plan.ts";
import { sessionSeconds, voyage } from "../sleep-voyage.ts";

import { wakePath,wakeStrength } from "../sleep/timeline.ts";
import { SYNTHETIC_SESSION, type DaySleepVoyage } from "../sleep/session.ts";

export interface WakePoint { x: number; z: number; behind: number }
export interface WakeSample {
  points: WakePoint[];
  strength: number;
  beam: number;
  stopped: boolean;
  stage?: string;
  yaw?: number;
}
export interface WakeSource { sample(replaySeconds: number): WakeSample }
export const TRAIL_LENGTH = 55;
const sternOffset = 9.94;
const beam = 5.6;
const fade = (seconds: number) => Math.max(0, 1-ambientTime(seconds)/2);

export function voyageWake(sleep: DaySleepVoyage | null): WakeSource {
  return {sample(seconds){
    const ship=voyage(sleep,seconds),strength=sleep?wakeStrength(sleep.session,ship.t):0;
    return {points:strength&&sleep?wakePath(sleep.session,ship.t):[],strength,beam,stopped:ship.stage==="AWAKE",stage:ship.stage,yaw:ship.yaw};
  }};
}

const straight = 60, turnRadius = 12, arc = Math.PI*turnRadius;
export const previewLap = 2*(straight+arc);
export const previewStop = 4800;
function previewStern(distance: number) {
  // Keep the isolated wake study seaward of the harbor entrance.
  const startX=HARBOR_MOUTH.point[0]+40,endX=startX+straight;
  const d = ((distance%previewLap)+previewLap)%previewLap;
  if (d<straight) return {x:startX+d,z:24,yaw:0};
  if (d<straight+arc) {
    const angle=(d-straight)/turnRadius;
    return {x:endX+turnRadius*Math.sin(angle),z:36-turnRadius*Math.cos(angle),yaw:-angle};
  }
  if (d<2*straight+arc) return {x:endX-(d-straight-arc),z:48,yaw:-Math.PI};
  const angle=(d-2*straight-arc)/turnRadius;
  return {x:startX-turnRadius*Math.sin(angle),z:36+turnRadius*Math.cos(angle),yaw:-Math.PI-angle};
}
function previewDistance(seconds: number) {
  return Math.min(seconds%(previewStop+1200),previewStop)*previewLap/previewStop;
}
export function previewPose(seconds: number) {
  const p=previewStern(previewDistance(seconds));
  return {x:p.x+sternOffset*Math.cos(p.yaw),z:p.z-sternOffset*Math.sin(p.yaw),yaw:p.yaw};
}
export const previewWake: WakeSource = {sample(seconds) {
  const distance=previewDistance(seconds);
  const strength=fade(Math.max(0,seconds%(previewStop+1200)-previewStop));
  const points: WakePoint[]=[];
  for(let behind=0;behind<=Math.min(TRAIL_LENGTH, distance);behind++) {
    const {x,z}=previewStern(distance-behind);
    points.push({x,z,behind});
  }
  return {points,strength,beam,stopped:seconds%(previewStop+1200)>=previewStop,yaw:previewStern(distance).yaw};
}};

const previewVoyage = {session:SYNTHETIC_SESSION,offset:0,timeZone:"America/Chicago"};

export function boatPathSamples(includeVoyage: boolean, includePreview: boolean) {
  const points: {x:number;z:number}[]=[voyage(null,0)];
  if(includeVoyage) {
    let last = points[0]!;
    for(let t=0;t<=sessionSeconds+4200;t+=5) {
      const ship=voyage(previewVoyage,t);
      if(Math.hypot(ship.x-last.x,ship.z-last.z)>=.5) {points.push(ship); last=ship;}
    }
  }
  if(includePreview) for(let d=0;d<previewLap;d+=1) points.push(previewPose(d*previewStop/previewLap));
  return points;
}
