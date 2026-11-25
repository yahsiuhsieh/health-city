import { ambientTime } from "../ocean/ambient-time.ts";
import { WORK_BOAT_BERTH } from "../city/harbor-plan.ts";
import { JETTY_SLIDE, ROUTE_LENGTH, S_MOUTH, returnStops, returnFrame, routeFrame } from "./route.ts";
import { asleepSeconds, elapsedSeconds, isAsleep, type SleepSession, type SleepSegment } from "./session.ts";

export interface RouteSpan extends SleepSegment { index: number; s0: number; s1: number }
function schedule(session: SleepSession) {
  const first = session.segments.find(s => isAsleep(s.stage));
  const lead = first ? Math.min(600,(first.end-first.start)*.25) : 0;
  const total = asleepSeconds(session);
  const slipTime=Math.min(.6*190,lead/2);
  const ease=(u:number)=>u*u*(3-2*u);
  function distance(a:number){
    if(!total || a<=0)return 0;
    if(a<=slipTime)return 1.5*ease(a/slipTime);
    if(a<lead){
      const u=(a-slipTime)/(lead-slipTime);
      const finalSlope=(ROUTE_LENGTH-S_MOUTH)/(total-lead)*(lead-slipTime)/(S_MOUTH-1.5);
      return 1.5+(S_MOUTH-1.5)*(ease(u)+Math.min(3,finalSlope)*u*u*(u-1));
    }
    const rate=(ROUTE_LENGTH-S_MOUTH)/(total-lead),remaining=(total-a)*rate;
    const approach=Math.min(40,(ROUTE_LENGTH-S_MOUTH)*.045);
    if(remaining>=approach)return S_MOUTH+(a-lead)*rate;
    const arrivalTime=approach/rate,slideTime=Math.min(114,arrivalTime*.22);
    const timeLeft=total-a;
    if(timeLeft<=slideTime)return ROUTE_LENGTH-JETTY_SLIDE+JETTY_SLIDE*ease(1-timeLeft/slideTime);
    const u=(arrivalTime-timeLeft)/(arrivalTime-slideTime);
    return ROUTE_LENGTH-approach+(approach-JETTY_SLIDE)*ease(u)+rate*(arrivalTime-slideTime)*u*(1-u)**2;
  }
  let clock = 0;
  const spans = session.segments.map((seg,index) => {
    const a0 = clock;
    if (isAsleep(seg.stage)) clock += seg.end-seg.start;
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
  return span ? distance(span.a0+(isAsleep(span.stage)?t-span.start:0)) : spans.at(-1)?.s1 ?? 0;
}
export function revealDistanceAt(session: SleepSession,t: number) {
  return t < 0 ? -1 : Math.min(ROUTE_LENGTH-60,routeDistanceAt(session,t+300));
}
export function islandRevealAt(session: SleepSession,t: number) {
  const u = Math.max(0,Math.min(1,1-(ROUTE_LENGTH-routeDistanceAt(session,t))/60));
  if (u === 1 && t < elapsedSeconds(session)) return .999;
  return u*u*(3-2*u);
}
export function returnDurations(available = Infinity) {
  const scale = Math.max(0,Math.min(1,available/4200));
  return {wait:600*scale,sail:3600*scale};
}
export function voyageState(session: SleepSession,t: number, available = session.returnSeconds) {
  const span = t < 0 ? null : routeSpans(session).find(seg => t < seg.end) ?? null;
  const s = routeDistanceAt(session,t), since = t-elapsedSeconds(session);
  const {wait,sail} = returnDurations(available);
  const phase = t<0?"harbor":!s && (!span || !isAsleep(span.stage))?"moored":span?(span.stage==="AWAKE"?"anchored":"sailing"):
    since<wait?"arrived":since<wait+sail?"returning":"moored";
  const stage = span?.stage ?? null;
  const berthed = phase==="moored" || phase==="harbor";
  const pose = berthed ? {x:WORK_BOAT_BERTH.position[0],z:WORK_BOAT_BERTH.position[1],yaw:WORK_BOAT_BERTH.yaw,maneuver:"hold" as const} :
    phase==="returning" ? returnFrame((since-wait)/sail,sail) : routeFrame(s);
  const anchor = stage==="AWAKE" && span && span.end-span.start>=240 ? Math.min(1,(t-span.start)/60,(span.end-t)/60) : 0;
  return {phase,stage,span,s,maneuver:phase==="arrived" || stage==="AWAKE"?"hold":pose.maneuver,x:pose.x,z:pose.z,yaw:pose.yaw,cabin:stage==="DEEP"?"closed":stage==="AWAKE"?"bright":"open",anchor,t};
}

const sternOffset=9.94;
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
  for (let t=0;t<=sessionSeconds+(session.returnSeconds ?? 4200);t+=trackStep) {
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
  t=Math.min(t,elapsedSeconds(session)+(session.returnSeconds ?? 4200));
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
    const {wait,sail}=returnDurations(session.returnSeconds);
    if(since<wait)return 0;
    if(since<wait+sail){
      const fraction=(since-wait)/sail;
      const {basinEntry,basinExit,alongside,castOff}=returnStops(sail);
      const from=fraction<basinEntry?castOff:basinExit;
      const to=fraction<basinEntry?basinEntry:alongside;
      return Math.max(0,Math.min(1,60*(fraction-from),60*(to-fraction)));
    }
    return 0;
  }
  if(!isAsleep(span.stage)){
    if(span.s0===0 || span.stage!=="AWAKE")return 0;
    return Math.max(0,1-ambientTime(t-span.start)/2);
  }
  const remaining=ROUTE_LENGTH-routeDistanceAt(session,t);
  if(remaining<15)return Math.max(0,(remaining-JETTY_SLIDE)/(15-JETTY_SLIDE));
  const previous=routeSpans(session)[span.index-1];
  if(previous?.stage==="AWAKE"){
    const held=previous.end-previous.start;
    const residual=previous.s0===0?0:Math.max(0,1-ambientTime(held)/2);
    return Math.min(1,residual+(t-span.start)/60);
  }
  return Math.min(1,t/60);
}
