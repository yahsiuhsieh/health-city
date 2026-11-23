import { CatmullRomCurve3, Vector3 } from "three";
import { port } from "./port-layout.ts";

export const departureDate = "2026-11-11";
export const arrivalDate = "2026-11-12";
export const departure = 23 * 3600;
const intervals = [
  ["LIGHT",60],["DEEP",85],["REM",40],["LIGHT",55],["AWAKE",8],
  ["LIGHT",52],["DEEP",65],["REM",50],["LIGHT",35],
] as const;
export const asleepMinutes = intervals.reduce((n,[stage,m])=>n+(stage==="AWAKE"?0:m),0);
let elapsed=0, asleep=0;
export const segments=intervals.map(([stage,minutes])=>{
  const start=elapsed, from=asleep/asleepMinutes;
  elapsed+=minutes*60;
  if(stage!=="AWAKE")asleep+=minutes;
  return {stage,start,end:elapsed,from,to:asleep/asleepMinutes};
});
export const wake=segments.find(s=>s.stage==="AWAKE")!;
export const sessionSeconds=elapsed;
export const radius=Math.sqrt(asleepMinutes*2.4/Math.PI);
export const islandX=57, islandZ=-5;
export function dayOffset(date:string,example:boolean){
  if(!example)return null;
  if(date===departureDate)return -departure;
  if(date===arrivalDate)return 86400-departure;
  return null;
}
export function coastPoint(f:number,r:number){
  const angle=f*2*Math.PI;
  return {x:islandX-r*Math.cos(angle),z:islandZ+r*Math.sin(angle)};
}
const berth=new Vector3(port.boatX,0,port.boatZ);
const dock=coastPoint(0,radius+3.8);
const departureFraction=15/asleepMinutes;
const landfall=coastPoint(departureFraction,radius+3.8);
const approach=new CatmullRomCurve3([berth,new Vector3(-1,0,2.4),new Vector3(9,0,4),new Vector3(26,0,-9),new Vector3(landfall.x-1,0,landfall.z-5),new Vector3(landfall.x,0,landfall.z)]);
const home=new CatmullRomCurve3([new Vector3(dock.x,0,dock.z),new Vector3(dock.x,0,1),new Vector3(28,0,5),new Vector3(9,0,-9),new Vector3(port.boatX,0,-8),berth]);
export function sailingPose(progress:number){
  if(progress<departureFraction)return curvePose(approach,progress/departureFraction);
  const f=progress;
  const p=coastPoint(f,radius+3.8);
  return {...p,yaw:2*Math.PI*f-Math.PI/2};
}
function curvePose(curve:CatmullRomCurve3,f:number){
  const p=curve.getPointAt(f),v=curve.getTangentAt(f);
  return {x:p.x,z:p.z,yaw:-Math.atan2(v.z,v.x)};
}
export function voyage(offset:number|null,seconds:number){
  const t=offset===null?-1:seconds+offset;
  const moored={x:port.boatX,z:port.boatZ,yaw:-Math.PI/2};
  if(t<0)return {...moored,t,progress:0,stage:"Harbor",moored:true};
  const s=segments.find(s=>t<s.end);
  if(s){
    const progress=s.from+(s.to-s.from)*(t-s.start)/(s.end-s.start);
    return {...sailingPose(progress),t,progress,stage:s.stage,moored:false};
  }
  const since=t-sessionSeconds;
  if(since<600)return {...sailingPose(1),t,progress:1,stage:"At island",moored:false};
  if(since<2400)return {...curvePose(home,(since-600)/1800),t,progress:1,stage:"Returning",moored:false};
  return {...moored,t,progress:1,stage:"Harbor",moored:true};
}
