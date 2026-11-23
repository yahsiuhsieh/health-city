import { sessionSeconds, voyage } from "../sleep-voyage.ts";

import { wakePath,wakeStrength } from "../sleep/timeline.ts";
import { SYNTHETIC_SESSION } from "../sleep/session.ts";

export interface WakePoint { x: number; z: number; behind: number }
export interface WakeSample {
  points: WakePoint[];
  strength: number;
  beam: number;
  stage?: string;
  yaw?: number;
}
export interface WakeSource { sample(replaySeconds: number): WakeSample }
export const TRAIL_LENGTH = 55;
const sternOffset = 7.1;
const beam = 5;
const fade = (seconds: number) => Math.max(0, 1-seconds/600);

export function voyageWake(offset: number | null): WakeSource {
  return {sample(seconds){
    const ship=voyage(offset,seconds),strength=wakeStrength(SYNTHETIC_SESSION,ship.t);
    return {points:strength?wakePath(SYNTHETIC_SESSION,ship.t):[],strength,beam,stage:ship.stage,yaw:ship.yaw};
  }};
}

const straight = 60, turnRadius = 12, arc = Math.PI*turnRadius;
export const previewLap = 2*(straight+arc);
export const previewStop = 4800;
function previewStern(distance: number) {
  const d = ((distance%previewLap)+previewLap)%previewLap;
  if (d<straight) return {x:24+d,z:24,yaw:0};
  if (d<straight+arc) {
    const angle=(d-straight)/turnRadius;
    return {x:84+turnRadius*Math.sin(angle),z:36-turnRadius*Math.cos(angle),yaw:-angle};
  }
  if (d<2*straight+arc) return {x:84-(d-straight-arc),z:48,yaw:-Math.PI};
  const angle=(d-2*straight-arc)/turnRadius;
  return {x:24-turnRadius*Math.sin(angle),z:36+turnRadius*Math.cos(angle),yaw:-Math.PI-angle};
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
  return {points,strength,beam,yaw:previewStern(distance).yaw};
}};

export function boatPathSamples(includeVoyage: boolean, includePreview: boolean) {
  const points: {x:number;z:number}[]=[voyage(null,0)];
  if(includeVoyage) {
    let last = points[0]!;
    for(let t=0;t<=sessionSeconds+2400;t+=5) {
      const ship=voyage(0,t);
      if(Math.hypot(ship.x-last.x,ship.z-last.z)>=.5) {points.push(ship); last=ship;}
    }
  }
  if(includePreview) for(let d=0;d<previewLap;d+=1) points.push(previewPose(d*previewStop/previewLap));
  return points;
}
