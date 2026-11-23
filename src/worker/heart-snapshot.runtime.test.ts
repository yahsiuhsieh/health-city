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
    const values=Array<number|null>(300).fill(null);values[44]=70.012;
    await saveHeartSnapshot(db,"sample",window,values,1,3);
    expect(await readHeartSnapshot(db,"sample",window)).toEqual(values);
    const empty=values.map(()=>null);
    await saveHeartSnapshot(db,"sample",window,empty,2,4);
    await saveHeartSnapshot(db,"sample",window,values,1,5);
    expect(await readHeartSnapshot(db,"sample",window)).toEqual(empty);
    await db.prepare("DELETE FROM google_connection").run();
    expect(await readHeartSnapshot(db,"sample",window)).toBeNull();
  }finally{await mf.dispose()}
});
