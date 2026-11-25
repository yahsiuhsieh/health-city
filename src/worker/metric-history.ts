import { Temporal } from "@js-temporal/polyfill";
import { elapsedSeconds, sleepInstant, type SleepSession } from "../core/sleep-replay.ts";
import type { D1Database } from "@cloudflare/workers-types";
import type { RecordedReplay } from "../core/recorded-replay.ts";
import type { DayWindow } from "./health-data.ts";

export const tables={heartRate:"heart_rate_days",hrv:"hrv_days",rhr:"rhr_days",steps:"step_days",calories:"energy_days",sleep:"sleep_query_days"} as const;
export type Metric=keyof typeof tables;
export const metrics=Object.keys(tables) as Metric[];
export const failed={status:"failed"} as const;
export function emptyDay(w:DayWindow):RecordedReplay{
  return {date:w.date,timeZone:w.timeZone,heartRate:failed,rhr:failed,hrv:failed,sleep:failed,steps:failed,calories:failed,cachedHeartRate:false};
}
export function rangeOf(windows:DayWindow[]):DayWindow {
  const last=windows[windows.length-1]!;
  return {...windows[0]!,end:last.end,nextDate:last.nextDate,following:last.following};
}
function fixedInstant(value:string){return Temporal.Instant.from(value).toString({fractionalSecondDigits:9});}
export async function loadHistory(db:D1Database,sub:string,windows:DayWindow[]){
  const range=rangeOf(windows);
  const queries=metrics.map(key=>{
    const daily=key==="hrv"||key==="rhr";
    return db.prepare(`SELECT * FROM ${tables[key]} WHERE google_sub=? AND date BETWEEN ? AND ?${daily?"":" AND zone=?"}`)
      .bind(sub,range.date,windows.at(-1)!.date,...(daily?[]:[range.timeZone]));
  });
  queries.push(db.prepare("SELECT * FROM sleep_sessions WHERE google_sub=? AND end_utc>=? AND start_utc<? ORDER BY start_utc")
    .bind(sub,fixedInstant(range.start),fixedInstant(range.end)));
  const results=await db.batch<Record<string,string|number|null>>(queries);
  const sessions=results.at(-1)!.results;
  return windows.map(w=>{
    const day=emptyDay(w);
    const synced:Partial<Record<Metric,number>>={};
    metrics.forEach((key,i)=>{
      const row=results[i]!.results.find(r=>r.date===w.date);
      if(!row)return;
      synced[key]=Number(row.synced_at);
      if(key==="hrv")day.hrv={status:"ready",value:row.rmssd_ms==null?null:Number(row.rmssd_ms)};
      else if(key==="sleep"){
        const start=fixedInstant(w.start),end=fixedInstant(w.end);
        day.sleep={status:"ready",value:sessions.filter(s=>String(s.end_utc)>=start && String(s.start_utc)<end)
          .map(s=>({id:String(s.session_id),startTime:Temporal.Instant.from(String(s.start_utc)).toString(),
            segments:JSON.parse(String(s.segments)),shortAwakenings:JSON.parse(String(s.short_awakenings))}))};
      }else {
        const value=JSON.parse(String(row[key==="rhr"?"records":key==="heartRate"?"means":"totals"]));
        day[key]={status:"ready",value};
      }
    });
    return {day,synced};
  });
}

export async function storeMetric(db:D1Database,sub:string,w:DayWindow,key:Metric,day:RecordedReplay,started:number){
  const stream=day[key];
  if(stream.status==="failed")return;
  if(key==="sleep"){
    const sessions=stream.value as SleepSession[];
    const args=[sub,w.date,w.timeZone,started];
    const writes=[db.prepare(`DELETE FROM sleep_sessions WHERE google_sub=? AND end_utc>=? AND end_utc<? AND start_utc<?
      AND synced_at<=? AND NOT EXISTS (SELECT 1 FROM sleep_query_days WHERE google_sub=? AND date=? AND zone=? AND synced_at>?)`)
      .bind(sub,fixedInstant(w.start),fixedInstant(w.following),fixedInstant(w.end),started,...args)];
    for(const s of sessions){
      writes.push(db.prepare(`INSERT INTO sleep_sessions SELECT ?,?,?,?,?,?,? WHERE NOT EXISTS
        (SELECT 1 FROM sleep_query_days WHERE google_sub=? AND date=? AND zone=? AND synced_at>?)
        ON CONFLICT(google_sub,session_id) DO UPDATE SET segments=excluded.segments,short_awakenings=excluded.short_awakenings,
        synced_at=excluded.synced_at WHERE excluded.synced_at>=sleep_sessions.synced_at`)
        .bind(sub,s.id,fixedInstant(s.startTime),sleepInstant(s,elapsedSeconds(s)).toString({fractionalSecondDigits:9}),
          JSON.stringify(s.segments),JSON.stringify(s.shortAwakenings??[]),started,...args));
    }
    writes.push(db.prepare(`INSERT INTO sleep_query_days VALUES(?,?,?,?) ON CONFLICT(google_sub,date,zone)
      DO UPDATE SET synced_at=max(synced_at,excluded.synced_at)`).bind(...args));
    await db.batch(writes);
    return;
  }
  const values:(number|string|null)[]=[sub,w.date];
  let columns:string[];
  if(key==="rhr" || key==="hrv"){
    const none=key==="rhr"?(stream.value as unknown[]).length===0:stream.value===null;
    columns=["status",key==="rhr"?"records":"rmssd_ms"];
    values.push(none?"none":"ready",key==="rhr"?JSON.stringify(stream.value):stream.value as number|null);
  }else{
    values.push(w.timeZone);
    columns=["start_utc","end_utc",key==="heartRate"?"means":"totals"];
    values.push(w.start,w.end,JSON.stringify(stream.value));
    if(key==="heartRate"){columns.push("requested_at");values.push(started);}
  }
  const table=tables[key],keys=key==="rhr"||key==="hrv"?"google_sub,date":"google_sub,date,zone";
  columns.push("synced_at");values.push(started);
  await db.prepare(`INSERT INTO ${table} (${keys},${columns.join(",")}) VALUES(${values.map(()=>"?").join(",")})
    ON CONFLICT(${keys}) DO UPDATE SET ${columns.map(c=>c+"=excluded."+c).join(",")}
    WHERE excluded.synced_at>=${table}.synced_at`).bind(...values).run();
}

export async function historyReplay(db:D1Database,sub:string,windows:DayWindow[],now:number,refresh:boolean,
  fetchRange:(key:Metric,range:DayWindow[])=>Promise<RecordedReplay[]>,active:()=>Promise<boolean>,waitUntil?:(work:Promise<void>)=>void){
  const cached=await loadHistory(db,sub,windows);
  const today=Temporal.Instant.fromEpochMilliseconds(now).toZonedDateTimeISO(windows[0]!.timeZone).toPlainDate();
  const recent=today.subtract({days:3}).toString();
  async function update(key:Metric,indices:number[],background:boolean){
    if(!indices.length)return;
    try{
      const targets=indices.map(i=>windows[i]!);
      const results=await fetchRange(key,targets);
      if(!await active())return;
      for(const [i,day] of results.entries()){
        const w=targets[i]!;
        if(!background)Object.assign(cached[indices[i]!]!.day,{[key]:day[key]});
        await storeMetric(db,sub,w,key,day,now);
      }
    }catch{
      if(!background)for(const i of indices){
        const row=cached[i]!;
        if(key==="heartRate" && row.day.heartRate.status==="ready")row.day.cachedHeartRate=true;
        else row.day[key]=failed;
      }
    }
  }
  await Promise.all(metrics.map(async key=>{
    const missing:number[]=[],stale:number[]=[];
    cached.forEach((row,i)=>{
      const stamp=row.synced[key];
      if(stamp===undefined || refresh)missing.push(i);
      else if(row.day.date>=recent && now-stamp>=6*3600000)stale.push(i);
    });
    if(waitUntil && stale.length)waitUntil(update(key,stale,true));
    await update(key,missing,false);
  }));
  return cached.map(r=>r.day);
}
