import { SYNTHETIC_SESSION as session,asleepSeconds,elapsedSeconds,type SleepStage } from "../scene/sleep/session.ts";
import { ISLAND_M2_PER_ASLEEP_MINUTE,stageMinutes } from "../scene/sleep/island-shape.ts";

const names:Record<SleepStage,string>={LIGHT:"Light sleep",DEEP:"Deep sleep",REM:"REM sleep",AWAKE:"Awake",ASLEEP:"Asleep (unclassified)"};
export const sleepLabel=(stage:string)=>names[stage as SleepStage]??stage;
const stamp=new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23",timeZone:"UTC"});
function label(t:number){
  const base=Date.parse(session.startDate+"T00:00:00Z");return stamp.format(base+1000*(session.startSecondOfDay+t));
}
const minutes=stageMinutes(session),asleep=asleepSeconds(session)/60,elapsed=elapsedSeconds(session)/60;
export function SleepDetails({kind,index,close,depart}:{kind:"stage"|"island"|"wake"|"sleep";index:number;close:()=>void;depart:()=>void}){
  const span=kind==="wake"?session.segments.find(s=>s.stage==="AWAKE"):kind==="stage"?session.segments[index]:undefined;
  const title=kind==="wake"?"Awakening buoy":kind==="stage"&&span?sleepLabel(span.stage):kind==="island"?"Sleep island":"Sleep voyage";
  return <aside className="record-card" aria-label={title}><div className="card-heading"><h2>{title}</h2><button aria-label="Close sleep details" onClick={close}>×</button></div>
    <p>{label(span?.start??0)} – {label(span?.end??elapsed*60)} · Chicago</p>
    {span?<p>{(span.end-span.start)/60} min{kind==="wake"?" awake":""}</p>:<>
      <p>{Math.floor(elapsed/60)} h {elapsed%60} min elapsed · {asleep} min asleep</p>
      {kind==="island"&&<><p>{Math.round(asleep*ISLAND_M2_PER_ASLEEP_MINUTE).toLocaleString("en-US")} m² · 2.4 m² per asleep minute</p>
      <dl>{Object.entries(minutes).filter(([,n])=>n>0).map(([stage,n])=><div key={stage}><dt>{sleepLabel(stage)}</dt><dd>{n} min · {(100*n/(stage==="AWAKE"?elapsed:asleep)).toFixed(1)}% of {stage==="AWAKE"?"elapsed":"asleep"} time</dd></div>)}</dl></>}
      <button onClick={depart}>View departure</button></>}
    <p>Synthetic sleep session</p></aside>;
}
