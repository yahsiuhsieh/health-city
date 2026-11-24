import { WORK_BOAT_BERTH } from "../scene/city/harbor-plan.ts";
import { ROUTE_LENGTH, routeFrame } from "../scene/sleep/route.ts";
import { asleepSeconds, type SleepSession } from "../scene/sleep/session.ts";

export function chartPoint(x:number,z:number) {
  const [bx,bz]=WORK_BOAT_BERTH.position;
  return {x:78+(x-bx)*.446,y:117+(z-bz)*.59};
}

// Measure the drawn track so equal asleep durations occupy equal lengths on the chart.
const course=Array.from({length:129},(_,i)=>{
  const p=routeFrame(ROUTE_LENGTH*i/128);
  return {...chartPoint(p.x,p.z),distance:0};
});
for(let i=1;i<course.length;i++){
  const p=course[i]!,q=course[i-1]!;
  p.distance=q.distance+Math.hypot(p.x-q.x,p.y-q.y);
}
const length=course[course.length-1]!.distance;
export function chartPosition(fraction:number){
  const distance=Math.max(0,Math.min(1,fraction))*length;
  const i=course.findIndex(p=>p.distance>=distance);
  const q=course[Math.max(1,i)]!,p=course[Math.max(0,i-1)]!;
  const u=(distance-p.distance)/(q.distance-p.distance);
  return {x:p.x+(q.x-p.x)*u,y:p.y+(q.y-p.y)*u,angle:Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI};
}
export function chartPath(start:number,end:number){
  const points=[chartPosition(start),...course.filter(p=>p.distance>start*length && p.distance<end*length),chartPosition(end)];
  return "M"+points.map(p=>p.x.toFixed(2)+" "+p.y.toFixed(2)).join("L");
}
export function chartSpans(session:SleepSession){
  const total=asleepSeconds(session);
  let asleep=0;
  return session.segments.map((s,index)=>{
    const from=asleep;
    if(s.stage!=="AWAKE")asleep+=s.end-s.start;
    return {...s,index,from:total?from/total:0,to:total?asleep/total:0};
  });
}
export type ChartSpan=ReturnType<typeof chartSpans>[number];
export function fractionAt(spans:ChartSpan[],time:number){
  const s=spans.find(item=>time<item.end);
  if(!s)return spans.at(-1)?.to??0;
  const u=Math.max(0,(time-s.start)/(s.end-s.start));
  return s.from+(s.to-s.from)*u;
}
