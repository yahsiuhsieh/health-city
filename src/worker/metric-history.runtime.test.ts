import {readFile} from "node:fs/promises";
import {expect,it} from "vitest";
import {Miniflare,convertV4MiniflareOptions} from "miniflare";
import type {D1Database} from "@cloudflare/workers-types";
import {dayWindow} from "./health-data.ts";
import {emptyDay,historyReplay,metrics,type Metric} from "./metric-history.ts";
import {summaryDates,summarizeReplay} from "../core/week-summary.ts";

it("fills the eight dates, serves stored history, and revalidates recent rows in the background",async()=>{
  const mf=new Miniflare(convertV4MiniflareOptions({host:"127.0.0.1",port:0,cf:false,modules:true,script:"export default {}",d1Databases:["DB"],compatibilityDate:"2026-10-01"}));
  try{
    const db=await mf.getD1Database("DB") as unknown as D1Database;
    for(const name of ["0001_auth","0003_heart_rate_days","0005_metric_history"]){
      const sql=await readFile(new URL("../../migrations/"+name+".sql",import.meta.url),"utf8");
      for(const statement of sql.split(";").filter(s=>s.trim()))await db.prepare(statement).run();
    }
    await db.prepare("INSERT INTO google_connection VALUES(1,'test','mock',NULL,'mock')").run();
    const windows=summaryDates("2026-11-04").map(date=>dayWindow(date,"America/Chicago")!);
    let now=Date.parse("2026-11-05T12:00:00Z"),failRhr=true,withSleep=true;
    const calls:{key:Metric;dates:string[]}[]=[],work:Promise<void>[]=[];
    const read=(dates=windows)=>historyReplay(db,"test",dates,now,false,async(key,targets)=>{
      calls.push({key,dates:targets.map(w=>w.date)});
      if(key==="rhr" && failRhr)throw Error("Incomplete range");
      return targets.map(w=>{
        const day=emptyDay(w);
        const values=Array<number>((Date.parse(w.end)-Date.parse(w.start))/300000).fill(1);
        if(key==="sleep")day.sleep={status:"ready",value:withSleep && w.date==="2026-11-04"?[
          {id:"nap",startTime:"2026-11-04T15:00:00Z",segments:[{stage:"LIGHT",start:0,end:1200}]}]:[]};
        else if(key==="hrv")day.hrv={status:"ready",value:22.03};
        else if(key==="rhr")day.rhr={status:"ready",value:[{bpm:58,method:null}]};
        else day[key]={status:"ready",value:values};
        return day;
      });
    },async()=>true,job=>work.push(job));
    const first=await read();
    expect(calls).toHaveLength(6);
    expect(calls.every(c=>c.dates.length===8)).toBe(true);
    expect(first.at(-1)?.rhr.status).toBe("failed");
    expect(await db.prepare("SELECT count(*) AS n FROM rhr_days").first("n")).toBe(0);
    failRhr=false;calls.length=0;
    await read();expect(calls.map(c=>c.key)).toEqual(["rhr"]);
    calls.length=0;
    const days=await read();
    expect(calls).toHaveLength(0);
    expect(summarizeReplay(days.find(d=>d.date==="2026-11-01")!).steps).toMatchObject({total:300,daySeconds:90000});
    expect(summarizeReplay(days.at(-1)!)).toEqual(summarizeReplay((await read(windows.slice(-1)))[0]!));
    now+=7*3600000;withSleep=false;
    expect(summarizeReplay((await read()).at(-1)!).sleep.seconds).toBe(1200);
    expect(work).toHaveLength(6);await Promise.all(work);
    expect(calls.every(c=>c.dates.length===3)).toBe(true);
    expect(summarizeReplay((await read()).at(-1)!).sleep.seconds).toBe(0);
    await db.prepare("DELETE FROM google_connection").run();
    for(const table of ["heart_rate_days","rhr_days","hrv_days","step_days","energy_days","sleep_sessions","sleep_query_days"]){
      expect(await db.prepare("SELECT count(*) AS n FROM "+table).first("n")).toBe(0);
    }
    expect(metrics).toHaveLength(6);
  }finally{await mf.dispose();}
});
