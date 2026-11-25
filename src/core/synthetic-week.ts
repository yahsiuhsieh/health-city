import { EXAMPLE_HRV } from "./daily-hrv.ts";
import { SYNTHETIC_DAYS } from "./representative-day.ts";
import { summaryDates, summarizeReplay } from "./week-summary.ts";
import { SYNTHETIC_SESSION } from "../scene/sleep/session.ts";

export function syntheticWeek(date:string) {
  const days=summaryDates(date).map(date=>{
    const exact=SYNTHETIC_DAYS.find(day=>day.date===date);
    const template=exact??SYNTHETIC_DAYS[Number(date.slice(-2))%SYNTHETIC_DAYS.length]!;
    const missing=!exact && date==="2026-11-08";
    const ready=<T>(value:T)=>({status:"ready",value} as const);
    const buckets=(values:(number|null)[])=>ready(missing?values.map(()=>null):values);
    return summarizeReplay({date,timeZone:template.zone,heartRate:buckets(template.heartMeans),
      steps:buckets(template.stepTotals),calories:buckets(template.calorieTotals),
      hrv:ready(missing?null:EXAMPLE_HRV.get(template.date)??null),
      rhr:ready(missing?[]:template.rhr),sleep:ready(missing||date==="2026-11-09"?[]:exact?
        date==="2026-11-12"?[SYNTHETIC_SESSION]:[]:[{...SYNTHETIC_SESSION,startTime:date+"T05:00:00Z"}])});
  });
  return {date,timeZone:SYNTHETIC_DAYS[0].zone,days};
}
