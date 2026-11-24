import { ambientTime } from "../ocean/ambient-time.ts";
import { seededRandom } from "./random.ts";
import { routeFrame, ROUTE_LENGTH, S_MOUTH } from "./route.ts";
import { routeDistanceAt, routeSpans } from "./timeline.ts";
import type { SleepSession } from "./session.ts";

export const companions = ["ray","whale","shark","dolphin"] as const;
export type Companion = typeof companions[number];
export function companionFor(session:SleepSession,index:number):Companion {
  const seed=seededRandom(session.id,"rem-companion")();
  const start=session.id==="synthetic-sleep-2026-11-11"?0:Math.floor(seed*companions.length);
  return companions[(start+index)%companions.length]!;
}
export const previewCompanion=(()=>{
  const name=import.meta.env?.DEV && typeof window!=="undefined"?new URLSearchParams(window.location.search).get("sleepCompanion"):null;
  return companions.find(kind=>kind===name);
})();
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>clamp(n)**2*(3-2*clamp(n));
export function companionState(session:SleepSession,t:number,override=previewCompanion){
  const rem=routeSpans(session).filter(s=>s.stage==="REM"),index=rem.findIndex(s=>s.start<=t&&t<s.end);
  if(index<0)return null;
  const span=rem[index]!,kind=override??companionFor(session,index),a=ambientTime(t-span.start),duration=ambientTime(span.end-span.start);
  const random=seededRandom(session.id,"encounter-"+index),choice=random();
  const side=span.s1>ROUTE_LENGTH-150?1:choice<.5?-1:1;
  const period=4+2*random(),cycle=(a+.85)%period;
  const special=a-duration*.48;
  const breach=kind==="whale"&&special>=0&&special<.85?Math.sin(Math.PI*special/.85):0;
  const roll=kind==="ray"?2*Math.PI*smooth(special/1.3):0;
  const surface=cycle<.94?Math.sin(Math.PI*cycle/.94):0;
  const across=kind==="whale"?17+2*Math.sin(a*.53):kind==="ray"?6+1.2*Math.sin(a*.64):kind==="shark"?10+1.5*Math.sin(a*.48):7;
  const height=kind==="whale"?-.90+.57*surface+4.4*breach:kind==="ray"?-.51+.18*Math.sin(a*1.1):-.82+.09*Math.cos(a);
  return {kind,side,across,height,a,cycle,period,surface,special,breach,roll,
    fade:smooth(a/.35)*smooth((duration-a)/.35),wing:.31*Math.sin(a*3.5),tail:.20*Math.sin(a*3.1),pod:6+Math.floor(random()*7)};
}
// The GLB exporter bakes these two curves. The instanced pod samples them at replay time.
export const dolphinPeriods={"bow-ride":1.64,leap:.5} as const;
export function dolphinMotion(clip:keyof typeof dolphinPeriods,age:number){
  const phase=age/dolphinPeriods[clip];
  if(clip==="leap"){
    const leap=Math.sin(Math.PI*phase);
    return {height:-.65+2.2*leap,pitch:.56*Math.cos(Math.PI*phase)*Math.sin(Math.PI*phase),leap};
  }
  const breath=age<.28?Math.sin(Math.PI*age/.28):0;
  return {height:-.65+.47*breath,pitch:.08*Math.sin(phase*Math.PI*2),leap:0};
}
export function dolphinAt(i:number,a:number,side:number){
  const angle=a*.85+i*2.39,cycle=(a+i*.49)%dolphinPeriods["bow-ride"];
  const beat=Math.floor(a/dolphinPeriods.leap);
  const motion=i===beat%6?dolphinMotion("leap",a-beat*dolphinPeriods.leap):dolphinMotion("bow-ride",cycle);
  return {along:i<3?11.2+i*.75+.35*Math.cos(angle):5-(i-3)*1.48+.48*Math.sin(angle),
    across:i<3?(i-1)*1.24:side*(3.4+(i%4)*1.7+.5*Math.cos(angle)),ripple:cycle,...motion};
}
type EventKind="dive"|"glide";
export interface LightEvent {
  kind:EventKind;start:number;duration:number;count:number;side:number;along:number;across:number;length:number;seed:number;
  frame:ReturnType<typeof routeFrame>;
}
const schedules=new WeakMap<SleepSession,LightEvent[]>();
export function lightEvents(session:SleepSession){
  let events=schedules.get(session);
  if(events)return events;
  events=[];
  for(const span of routeSpans(session).filter(s=>s.stage==="LIGHT")){
    for(const kind of ["dive","glide"] as const){
      const random=seededRandom(session.id,kind+"-"+span.index);
      for(let a=random()*.7;a<ambientTime(span.end-span.start);a+=1.5+random()*1.5){
        const start=span.start+a*190,distance=routeDistanceAt(session,start);
        if(distance<S_MOUTH+12)continue;
        const duration=kind==="glide"?1.2+1.3*random():.8;
        events.push({kind,start,duration,count:kind==="glide"?4+Math.floor(7*random()):6+Math.floor(5*random()),
          side:random()<.5?-1:1,along:kind==="glide"?20+random()*19:3+random()*7,across:5+random()*6,length:20+random()*25,
          seed:random()*20,frame:routeFrame(distance)});
      }
    }
  }
  events.sort((a,b)=>a.start-b.start);
  schedules.set(session,events);return events;
}
export function fishAt(e:LightEvent,i:number,age:number){
  const time=age-i*.025,progress=time/e.duration,range=e.length*clamp(progress);
  const lobes=i%3===0?2:1;
  const height=Math.abs(Math.sin(lobes*Math.PI*clamp(progress)));
  return {along:e.along+range*.58+.96*Math.sin(e.seed+i*2.4),across:e.side*(e.across+range*.815+.93*Math.cos(e.seed+i*1.7)+i*.37),
    height:.04+height*(.42+.72*(.5+.5*Math.sin(e.seed+i))),progress};
}
