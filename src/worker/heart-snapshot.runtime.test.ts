import { readFile } from "node:fs/promises";
import { it,expect } from "vitest";
import { Miniflare,convertV4MiniflareOptions } from "miniflare";
import type { D1Database } from "@cloudflare/workers-types";
import { dayWindow } from "./health-data.ts";
import { readHeartSnapshot,saveHeartSnapshot } from "./heart-snapshot.ts";

it("replaces complete account-day snapshots atomically in local D1",async()=>{
  const mf=new Miniflare(convertV4MiniflareOptions({host:"127.0.0.1",port:0,cf:false,modules:true,script:"export default {}",d1Databases:["DB"],compatibilityDate:"2026-10-01"}));
  try {
    const db=await mf.getD1Database("DB") as unknown as D1Database;
    for(const file of ["0001_auth","0003_heart_rate_days"]){
      const sql=await readFile(new URL("../../migrations/"+file+".sql",import.meta.url),"utf8");
      for(const statement of sql.split(";").filter(s=>s.trim()))await db.prepare(statement).run();
    }
    await db.prepare("INSERT INTO google_connection VALUES(1,'sample','mock',NULL,'mock')").run();
    const window=dayWindow("2026-11-01","America/Chicago")!;
    const values=Array<number|null>(300).fill(null);
    values[44]=70.015;
    values[46]=0;
    values[299]=70.012;
    const expected=values.slice();
    expected[44]=70.02;
    expected[299]=70.01;
    await db.prepare("INSERT INTO heart_rate_days VALUES(?,?,?,?,?,?,?,?)")
      .bind("sample",window.date,window.timeZone,window.start,window.end,JSON.stringify(values),0,0).run();
    expect(await readHeartSnapshot(db,"sample",window)).toEqual(expected);

    const migration=await readFile(new URL("../../migrations/0004_round_heart_rate_means.sql",import.meta.url),"utf8");
    const storedMeans=async()=>JSON.parse((await db.prepare("SELECT means FROM heart_rate_days").first<string>("means"))!);
    expect((await db.prepare(migration).run()).meta.changes).toBe(1);
    expect(await storedMeans()).toEqual(expected);
    expect((await db.prepare(migration).run()).meta.changes).toBe(0);
    await saveHeartSnapshot(db,"sample",window,values,1,3);
    expect(await storedMeans()).toEqual(expected);
    const empty=values.map(()=>null);
    await saveHeartSnapshot(db,"sample",window,empty,2,4);
    await saveHeartSnapshot(db,"sample",window,values,1,5);
    expect(await readHeartSnapshot(db,"sample",window)).toEqual(empty);
    await db.prepare("DELETE FROM google_connection").run();
    expect(await readHeartSnapshot(db,"sample",window)).toBeNull();
  }finally{await mf.dispose()}
});
