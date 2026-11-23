import { WORK_BOAT_BERTH } from "../city/harbor-plan.ts";
import { ROUTE_LENGTH, S_MOUTH, returnFrame, routeFrame } from "./route.ts";
import { asleepSeconds, elapsedSeconds, type SleepSession, type SleepSegment } from "./session.ts";

export interface RouteSpan extends SleepSegment { index: number; s0: number; s1: number }
function schedule(session: SleepSession) {
  const first = session.segments.find(s => s.stage !== "AWAKE");
  const lead = first ? Math.min(600,(first.end-first.start)*.25) : 0;
  const total = asleepSeconds(session);
  const distance = (a: number) => !total ? 0 : a <= lead ? S_MOUTH*a/lead
    : S_MOUTH+(ROUTE_LENGTH-S_MOUTH)*(a-lead)/(total-lead);
  let clock = 0;
  const spans = session.segments.map((seg,index) => {
    const a0 = clock;
    if (seg.stage !== "AWAKE") clock += seg.end-seg.start;
    return {...seg,index,a0,s0:distance(a0),s1:distance(clock)};
  });
  return {spans,distance};
}
const schedules = new WeakMap<SleepSession, ReturnType<typeof schedule>>();
function forSession(session: SleepSession) {
  let entry = schedules.get(session);
  if (!entry) { entry = schedule(session); schedules.set(session,entry); }
  return entry;
}
export function routeSpans(session: SleepSession): readonly RouteSpan[] { return forSession(session).spans; }
export function routeDistanceAt(session: SleepSession,t: number) {
  if (t <= 0) return 0;
  const {spans,distance} = forSession(session);
  const span = spans.find(seg => t < seg.end);
  return span ? distance(span.a0+(span.stage==="AWAKE"?0:t-span.start)) : spans.at(-1)?.s1 ?? 0;
}
export function revealDistanceAt(session: SleepSession,t: number) {
  return t < 0 ? -1 : Math.min(ROUTE_LENGTH-12,routeDistanceAt(session,t+300));
}
export function islandRevealAt(session: SleepSession,t: number) {
  const u = Math.max(0,Math.min(1,1-(ROUTE_LENGTH-routeDistanceAt(session,t))/12));
  return u*u*(3-2*u);
}
export function returnDurations(available = Infinity) {
  const scale = Math.max(0,Math.min(1,available/2400));
  return {wait:600*scale,sail:1800*scale};
}
export function voyageState(session: SleepSession,t: number, available = Infinity) {
  const span = t < 0 ? null : routeSpans(session).find(seg => t < seg.end) ?? null;
  const s = routeDistanceAt(session,t), since = t-elapsedSeconds(session);
  const {wait,sail} = returnDurations(available);
  const phase = t<0?"harbor":span?(span.stage==="AWAKE"?"anchored":"sailing"):s===0?"moored":
    since<wait?"arrived":since<wait+sail?"returning":"moored";
  const stage = span?.stage ?? null;
  const berthed = phase==="moored" || phase==="harbor";
  const pose = berthed ? {x:WORK_BOAT_BERTH.position[0],z:WORK_BOAT_BERTH.position[1],yaw:WORK_BOAT_BERTH.yaw} :
    phase==="returning" ? returnFrame((since-wait)/sail) : routeFrame(s);
  if(phase==="returning"){
    const fraction=(since-wait)/sail;
    const smooth=(v:number)=>{const n=Math.max(0,Math.min(1,v));return n*n*(3-2*n);};
    const startYaw=routeFrame(ROUTE_LENGTH).yaw;
    const turn=Math.atan2(Math.sin(pose.yaw-startYaw),Math.cos(pose.yaw-startYaw));
    // Turn away from the pier, then swing offshore before backing into the fairway.
    pose.yaw=startYaw+smooth(fraction/.075)*turn+Math.PI*smooth((fraction-.62)/.16);
  }
  const anchor = stage==="AWAKE" && span && span.end-span.start>=240 ? Math.min(1,(t-span.start)/60,(span.end-t)/60) : 0;
  return {phase,stage,span,s,x:pose.x,z:pose.z,yaw:pose.yaw,cabin:stage==="DEEP"?"closed":stage==="AWAKE"?"bright":"open",anchor,t};
}

const sternOffset=7.1;
interface TrackPoint { x: number; z: number; distance: number }
function lowerSegment(track: TrackPoint[], distance: number) {
  let low = 0, high = track.length-1;
  while (high-low>1) {
    const middle = (low+high)>>1;
    if (track[middle]!.distance <= distance) low=middle;
    else high=middle;
  }
  return low;
}

function sternAt(session: SleepSession,seconds: number) {
  const ship = voyageState(session,seconds);
  return { x: ship.x-sternOffset*Math.cos(ship.yaw), z: ship.z+sternOffset*Math.sin(ship.yaw) };
}

// Sample stern travel by distance so the wake follows bends on either lane.
const trackStep = 5;
const tracks=new WeakMap<SleepSession,TrackPoint[]>();
function sternTrack(session: SleepSession) {
  const cached=tracks.get(session);
  if(cached)return cached;
  const sessionSeconds=elapsedSeconds(session);
  const track: TrackPoint[] = [];
  for (let t=0;t<=sessionSeconds+2400;t+=trackStep) {
    const point = sternAt(session,t);
    const last = track.at(-1);
    track.push({...point,distance:last ? last.distance+Math.hypot(point.x-last.x,point.z-last.z) : 0});
  }
  tracks.set(session,track);
  return track;
}

export function wakePath(session: SleepSession,t:number,count=55,spacing=1) {
  const points:{x:number;z:number;behind:number}[]=[];
  if(t<=0 || count<=0 || spacing<=0)return points;
  t=Math.min(t,elapsedSeconds(session)+2400);
  const track = sternTrack(session);
  const last = track[Math.floor(t/trackStep)]!;
  const stern = sternAt(session,t);
  const advance = Math.hypot(stern.x-last.x,stern.z-last.z);
  const distance = last.distance+advance;
  points.push({...stern,behind:0});
  for (let i=1;i<count && i*spacing<=distance;i++) {
    const behind=i*spacing,d = distance-behind;
    const segment = lowerSegment(track,d);
    const a=track[segment]!, b=track[segment+1]!;
    const u=(d-a.distance)/Math.max(.00001,b.distance-a.distance);
    points.push({x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u,behind});
  }
  return points;
}
export function wakeStrength(session:SleepSession,t:number){
  if(t<=0 || !asleepSeconds(session))return 0;
  const span=routeSpans(session).find(s=>t<s.end), since=t-elapsedSeconds(session);
  if(!span){
    if(since<600)return Math.max(0,1-since/600);
    if(since<2400)return Math.min(1,(since-600)/60);
    return Math.max(0,1-(since-2400)/600);
  }
  if(span.stage==="AWAKE"){
    if(span.s0===0)return 0;
    return Math.max(0,1-(t-span.start)/600);
  }
  const previous=routeSpans(session)[span.index-1];
  if(previous?.stage==="AWAKE"){
    const held=previous.end-previous.start;
    const residual=previous.s0===0?0:Math.max(0,1-held/600);
    return Math.min(1,residual+(t-span.start)/60);
  }
  return Math.min(1,t/60);
}
