import { ROUTE_LENGTH, routeFrame } from "../scene/sleep/route.ts";
import { routeSpans } from "../scene/sleep/timeline.ts";

export function chartPoint(x:number,z:number) {
  return {x:54+.75*(x*Math.cos(.3)+z*Math.sin(.3)),y:118+.56*(-x*Math.sin(.3)+z*Math.cos(.3))};
}
export function chartPosition(distance:number){
  const frame=routeFrame(distance);
  return chartPoint(frame.x,frame.z);
}
const course=Array.from({length:129},(_,i)=>{
  const distance=ROUTE_LENGTH*i/128;
  return {...chartPosition(distance),distance};
});
export function chartPath(start:number,end:number){
  const points=[chartPosition(start),...course.filter(p=>p.distance>start && p.distance<end),chartPosition(end)];
  return "M"+points.map(p=>p.x.toFixed(2)+" "+p.y.toFixed(2)).join("L");
}
export const chartSpans=routeSpans;
export type ChartSpan=ReturnType<typeof routeSpans>[number];
