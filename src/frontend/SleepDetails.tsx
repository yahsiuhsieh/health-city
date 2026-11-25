import { SYNTHETIC_SESSION as session,asleepSeconds,elapsedSeconds,type SleepStage } from "../scene/sleep/session.ts";

const names:Record<SleepStage,string>={LIGHT:"Light sleep",DEEP:"Deep sleep",REM:"REM sleep",AWAKE:"Awake",ASLEEP:"Asleep (unclassified)"};
export const sleepLabel=(stage:string)=>names[stage as SleepStage]??stage;
const stamp=new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23",timeZone:"UTC"});
export function sleepStamp(t:number){
  const base=Date.parse(session.startDate+"T00:00:00Z");return stamp.format(base+1000*(session.startSecondOfDay+t));
}
export function SleepDetails({kind,close,depart,openChart}:{kind:"wake"|"sleep";close:()=>void;depart:()=>void;openChart:()=>void}){
  const span=kind==="wake"?session.segments.find(s=>s.stage==="AWAKE"):undefined;
  const title=span?"Awakening buoy":"Sleep voyage";
  return <aside className="record-card" aria-label={title}><div className="card-heading"><h2>{title}</h2><button aria-label="Close sleep details" onClick={close}>×</button></div>
    <p>{sleepStamp(span?.start??0)} – {sleepStamp(span?.end??elapsedSeconds(session))} · Chicago</p>
    {span?<p>{(span.end-span.start)/60} min awake</p>:<p>{elapsedSeconds(session)/60} min elapsed · {asleepSeconds(session)/60} min asleep</p>}
    <p>Synthetic sleep session</p>
    <button onClick={openChart}>Open sleep voyage</button> {!span&&<button onClick={depart}>View departure</button>}
  </aside>;
}
