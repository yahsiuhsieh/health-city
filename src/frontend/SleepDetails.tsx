import { asleepSeconds, elapsedSeconds, type DaySleepVoyage, type SleepSpan, type SleepStage } from "../core/sleep-replay.ts";

const names: Record<SleepStage, string> = {
  LIGHT: "Light sleep", DEEP: "Deep sleep", REM: "REM sleep", AWAKE: "Awake", ASLEEP: "Asleep (unclassified)",
  RESTLESS: "Restless", UNKNOWN: "Sleep stage unavailable",
};
export const sleepLabel = (stage: string) => names[stage as SleepStage] ?? stage;

export function sleepFormatter({session, timeZone}: DaySleepVoyage, options: Intl.DateTimeFormatOptions) {
  const start = Date.parse(session.startTime);
  const formatter = new Intl.DateTimeFormat("en-US", {timeZone, ...options});
  return (seconds: number) => formatter.format(start + seconds * 1000);
}

export function SleepDetails({sleep,wake,synthetic,close,depart,openChart}:{
  sleep:DaySleepVoyage; wake?:SleepSpan; synthetic:boolean; close:()=>void; depart?:()=>void; openChart:()=>void;
}){
  const {session,timeZone}=sleep;
  const elapsed=elapsedSeconds(session),asleep=asleepSeconds(session);
  const stamp=sleepFormatter(sleep,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
  const title=wake?"Awakening buoy":"Sleep voyage";
  const minutes=(seconds:number)=>Number((seconds/60).toFixed(2));
  return <aside className="record-card" aria-label={title}><div className="card-heading"><h2>{title}</h2><button aria-label="Close sleep details" onClick={close}>×</button></div>
    <p>{stamp(wake?.start??0)} – {stamp(wake?.end??elapsed)} · {timeZone}</p>
    {wake?<p>{minutes(wake.end-wake.start)} min awake</p>:<p>{minutes(elapsed)} min elapsed · {asleep ? minutes(asleep)+" min asleep" : "No confirmed time asleep"}</p>}
    <p>{synthetic?"Synthetic sleep session":"Google Health sleep session"}</p>
    <button onClick={openChart}>Open sleep voyage</button> {!wake&&depart&&<button onClick={depart}>View departure</button>}
  </aside>;
}
