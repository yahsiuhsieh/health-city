import type { D1Database } from "@cloudflare/workers-types";
import type { DayWindow } from "./health-data.ts";

export async function readHeartSnapshot(db:D1Database,subject:string,window:DayWindow) {
  const row=await db.prepare("SELECT means FROM heart_rate_days WHERE google_sub=? AND date=? AND zone=?")
    .bind(subject,window.date,window.timeZone).first<{means:string}>();
  if(!row)return null;
  const values:unknown=JSON.parse(row.means);
  const count=(Date.parse(window.end)-Date.parse(window.start))/300000;
  if(!Array.isArray(values)||values.length!==count||values.some(v=>v!==null&&(typeof v!=="number"||!Number.isFinite(v)||v<0)))return null;
  return values as (number|null)[];
}

export async function saveHeartSnapshot(db:D1Database,subject:string,window:DayWindow,
  values:(number|null)[],requestedAt:number,syncedAt:number) {
  await db.prepare(`INSERT INTO heart_rate_days(google_sub,date,zone,start_utc,end_utc,means,requested_at,synced_at)
    VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(google_sub,date,zone) DO UPDATE SET
    means=excluded.means,start_utc=excluded.start_utc,end_utc=excluded.end_utc,
    requested_at=excluded.requested_at,synced_at=excluded.synced_at
    WHERE excluded.requested_at>=heart_rate_days.requested_at`)
    .bind(subject,window.date,window.timeZone,window.start,window.end,JSON.stringify(values),requestedAt,syncedAt).run();
}
