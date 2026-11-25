import { earlierAverage, type summarizeReplay } from "../core/week-summary.ts";
import { isAsleep,type DaySleepVoyage } from "../core/sleep-replay.ts";
import type { FocusTarget } from "../scene/focus-flight.ts";

export type Metric=Exclude<FocusTarget,"world">;
export type Summary=ReturnType<typeof summarizeReplay>;
export const names:Record<Metric,string>={sleep:"Sleep",heart:"Heart rate",hrv:"Heart rate variability",rhr:"Resting heart rate",steps:"Steps",energy:"Energy"};
export const units:Record<Metric,string>={sleep:"",heart:"bpm",hrv:"ms",rhr:"bpm",steps:"steps",energy:"kcal"};
export function formatValue(value:number|null,metric:Metric,short=false){
  if(value===null)return "—";
  if(metric==="sleep"){const mins=Math.round(value/60);return Math.floor(mins/60)+(short?"h ":" h ")+mins%60+(short?"m":" min");}
  return value.toLocaleString("en-US",{maximumFractionDigits:short?(value>=1000?1:0):2,notation:short&&value>=1000?"compact":"standard"}).replace("K","k");
}
export function sum(values:readonly (number|null)[]){
  const known=values.filter((v):v is number=>v!==null);
  return known.length?known.reduce((a,b)=>a+b,0):null;
}
export function sleepAt(sleep:DaySleepVoyage|null,seconds:number){
  if(!sleep)return null;
  const until=seconds+sleep.offset;
  if(!sleep.session.segments.some(s=>isAsleep(s.stage))&&sleep.session.segments.some(s=>s.stage==="UNKNOWN"))return null;
  return sleep.session.segments.reduce((n,s)=>n+(isAsleep(s.stage)?Math.max(0,Math.min(until,s.end)-s.start):0),0);
}
export function methodLabel(method:string|null){return method==="WITH_SLEEP"?"With sleep data":method==="ONLY_WITH_AWAKE_DATA"?"Awake data only":method??"Method not specified";}
export function weekPoint(day:Summary,m:Metric){
  let value:number|null=null,low:number|null=null,high:number|null=null,detail="",parts:number[]|undefined;
  if(m==="rhr"){
    const v=day.rhr;
    if(v.status==="value"){value=v.bpm;detail=methodLabel(v.method);}
    if(v.status==="failed")detail="Read failed";
  }else if(m==="hrv"){
    if(day.hrv.status==="ready")value=day.hrv.value;else detail="Read failed";
  }else if(m==="sleep"){
    const v=day.sleep;
    if(v.status==="ready"||v.status==="partial"){value=v.seconds;parts=[v.stages.DEEP,v.stages.LIGHT,v.stages.REM,v.stages.ASLEEP];}
    if(v.status==="failed")detail="Read failed";
  }else{
    const v=day[m];
    if(v.status==="ready"||v.status==="partial"){
      value=m==="heart"?v.mean:v.total;low=v.low;high=v.high;
    }else if(v.status==="failed")detail="Read failed";
  }
  return {label:day.date,value,low,high,parts,detail};
}
export type ChartPoint=ReturnType<typeof weekPoint>;
export function compareWeek(points:ChartPoint[],metric:Metric){
  const {count,mean}=earlierAverage(points.slice(0,7).map(p=>p.value));
  const today=points[7]?.value;
  if(count<3||mean===null)return {avg:null,text:"Not enough earlier data ("+count+" of 7 days)"};
  const label=(count===7?"7-day average":"avg of "+count+" days")+" · "+formatValue(mean,metric);
  if(today==null)return {avg:mean,text:label};
  const delta=today-mean;
  return {avg:mean,direction:Math.abs(delta)<.005?null:delta>0?"up":"down",text:Math.abs(delta)<.005?"Same as "+label:formatValue(Math.abs(delta),metric)+(delta>0?" above ":" below ")+label};
}
