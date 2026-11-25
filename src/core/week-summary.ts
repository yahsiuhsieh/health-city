import { Temporal } from "@js-temporal/polyfill";
import { roundMeasurement } from "./measurement.ts";
import { canonicalRhr } from "./rhr.ts";
import { elapsedSeconds, isAsleep, sleepInstant } from "./sleep-replay.ts";
import type { RecordedReplay, ReplayStream } from "./recorded-replay.ts";

export const WEEK_SUMMARY_PATH="/api/summary/week";
export function summaryDates(date:string) {
  const last=Temporal.PlainDate.from(date);
  return Array.from({length:8},(_,i)=>last.subtract({days:7-i}).toString());
}

function bucketSummary(stream:ReplayStream<(number|null)[]>) {
  if(stream.status==="failed")return {status:"failed" as const};
  const measurements=stream.value.filter((v):v is number=>v!==null);
  if(!measurements.length)return {status:"none" as const};
  const total=roundMeasurement(measurements.reduce((sum,v)=>sum+v,0));
  return {
    status: measurements.length===stream.value.length?"ready" as const:"partial" as const,
    total, mean:roundMeasurement(total/measurements.length),low:Math.min(...measurements),high:Math.max(...measurements),
    coveredSeconds:measurements.length*300,daySeconds:stream.value.length*300,
  };
}

export function summarizeReplay(day:RecordedReplay) {
  const dailySleep=day.sleep.status==="ready" ? day.sleep.value.filter(session=>
    sleepInstant(session,elapsedSeconds(session)).toZonedDateTimeISO(day.timeZone).toPlainDate().toString()===day.date) : [];
  const stages={LIGHT:0,DEEP:0,REM:0,ASLEEP:0};
  let partial=false;
  for(const session of dailySleep)for(const span of session.segments){
    if(span.stage in stages && isAsleep(span.stage))stages[span.stage as keyof typeof stages]+=span.end-span.start;
    if(span.stage==="UNKNOWN")partial=true;
  }
  return {date:day.date,heart:bucketSummary(day.heartRate),steps:bucketSummary(day.steps),energy:bucketSummary(day.calories),
    hrv:day.hrv, rhr:day.rhr.status==="ready"?canonicalRhr(day.rhr.value):day.rhr,
    sleep:{status:day.sleep.status==="failed"?"failed":!dailySleep.length?"none":partial?"partial":"ready",
      stages,seconds:Object.values(stages).reduce((sum,v)=>sum+v,0)}};
}
export function earlierAverage(values:readonly (number|null)[]){
  const available=values.filter((v):v is number=>v!==null);
  return {count:available.length,mean:available.length?roundMeasurement(available.reduce((a,b)=>a+b,0)/available.length):null};
}
