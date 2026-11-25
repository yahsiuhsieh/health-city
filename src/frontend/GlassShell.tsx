import {useEffect,useMemo,useRef,useState,type CSSProperties,type ReactNode} from "react";
import {flushSync} from "react-dom";
import {Temporal} from "@js-temporal/polyfill";
import type {Replay,ReplaySnapshot} from "../core/replay.ts";
import type {RecordedReplay} from "../core/recorded-replay.ts";
import {canonicalRhr} from "../core/rhr.ts";
import {lastEndedReplayDate,SYNTHETIC_DAYS,type ReplayDay} from "../core/representative-day.ts";
import type {DaySleepVoyage,SleepSpan} from "../core/sleep-replay.ts";
import {focusLabels,type FocusTarget} from "../scene/focus-flight.ts";
import {MetricCard,type Rhr} from "./MetricCard.tsx";
import {formatValue,sleepAt,sum,type Metric} from "./metric-values.ts";
import {useWeek} from "./use-week.ts";
import {cityLight} from "../scene/lighting.ts";
import "./glass-shell.css";

const order:FocusTarget[]=["world","sleep","heart","hrv","rhr","steps","energy"];
const paths={
 world:"M3 9l9-6 9 6-9 5z M3 13l9 5 9-5 M3 17l9 5 9-5",
 sleep:"M4 16h16l-3 4H7z M12 4v12 M10 6l-5 8h5 M14 7l4 7h-4",
 heart:"M2 12h5l3-8 4 16 3-8h5",
 hrv:"M3 21h18 M5 20V12h3v8 M10 20V4h4v16 M16 20V9h3v11",
 rhr:"M3 16q3-3 6 0t6 0t6 0 M3 20q3-3 6 0t6 0t6 0 M12 3v8 M8 7l4 4 4-4",
 steps:"M8 4c-2 0-3 3-2 6s3 3 4 1 0-7-2-7z M8 15l3-1 1 3-3 1z M16 9c2 0 4 3 3 6s-3 3-4 1 0-7 1-7z M14 20l3 1",
 energy:"M14 2L5 14h6l-1 8 9-13h-6z",
 settings:"M3 6h9m4 0h5M3 12h3m4 0h11M3 18h11m4 0h3 M12 4v4 M7 10v4 M15 16v4",
 back:"M14 6l-6 6 6 6",next:"M10 6l6 6-6 6",play:"M7 4l13 8-13 8z",pause:"M8 4v16m8-16v16",
 down:"M6 9l6 6 6-6",
};
function Icon({name}:{name:keyof typeof paths}){return <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]}/></svg>;}
interface Props{
 children:ReactNode;day:ReplayDay;replay:Replay;clock:ReplaySnapshot;focus:FocusTarget;open:boolean;choose:(f:FocusTarget)=>void;close:()=>void;
 date:(d:string)=>void;source:(synthetic:boolean)=>void;refresh:()=>void;synthetic:boolean;google:boolean;recorded?:RecordedReplay;
 rmssd:number|null;towers:number|null;load:string;ready:boolean;lost:boolean;night:boolean;failures:string[];
 sleep:DaySleepVoyage|null;sessions:DaySleepVoyage[];selectSession:(id:string)=>void;wake?:SleepSpan;interval?:[number,number];
}
export function GlassShell(p:Props){
 const {day,replay,clock,focus,synthetic}=p;
 const [menu,setMenu]=useState<"date"|"settings"|null>(null),[weekly,setWeekly]=useState(false);
 const [hint,setHint]=useState(()=>{try{return !localStorage.getItem("hc-orbit-hint");}catch{return true;}});
 const dismiss=()=>{setHint(false);try{localStorage.setItem("hc-orbit-hint","1");}catch{/* Storage is optional. */}};
 useEffect(()=>{if(!hint)return;const id=setTimeout(dismiss,6500);return ()=>clearTimeout(id);},[hint]);
 const shell=useRef<HTMLElement>(null);
 const history=useWeek(day.date,day.zone,synthetic);
 const metric=p.open&&focus!=="world"?focus:null;
 const index=Math.min(day.heartMeans.length-1,Math.floor(clock.seconds/300));
 const interval=p.interval??[index,index+1] as [number,number];
 const asleep=sleepAt(p.sleep,clock.seconds);
 const rhr:Rhr=synthetic?canonicalRhr(day.rhr):p.recorded?.rhr.status==="ready"?canonicalRhr(p.recorded.rhr.value):{status:"failed"};
 const values:Record<Metric,number|null>={
   sleep:asleep,heart:day.heartMeans[index]??null,hrv:p.rmssd,rhr:rhr.status==="value"?rhr.bpm:null,
   steps:accumulated(day.stepTotals,clock.seconds),energy:accumulated(day.calorieTotals,clock.seconds),
 };
 const source=synthetic?"Synthetic data":"Google Health";
 const status=p.load==="loading"||p.load==="idle"?"Loading…":p.load==="sign-in"?"Sign in required":p.load==="renew"?"Renew authorization":p.load==="error"?"Could not load day":p.recorded?.cachedHeartRate?"Cached":source;
 const noRecords=!synthetic&&p.recorded&&p.failures.length===0&&day.heartMeans.every(v=>v===null)&&day.stepTotals.every(v=>v===null)&&day.calorieTotals.every(v=>v===null)&&!p.sessions.length&&values.hrv===null&&rhr.status==="none";
 const message=p.lost?"Graphics stopped. Reload to restore the scene.":p.failures.length?"Could not read "+p.failures.join(", "):p.load==="error"?"Could not load day":noRecords?"No health records for this date":history.updated?"Updated records available":hint?"Drag to orbit · Scroll to zoom":"";
 const weekRetry=()=>void history.load();
 const selection=useRef("");
 selection.current=source+day.date;
 const refresh=async()=>{
   const requested=selection.current;
   setMenu(null);
   await history.load(true);
   if(selection.current===requested)p.refresh();
 };
 function choose(next:FocusTarget){
   setMenu(null);
   const change=()=>flushSync(()=>p.choose(next));
   const chip=shell.current?.querySelector<HTMLElement>('[data-chip="'+next+'"]');
   const oldCard=shell.current?.querySelector<HTMLElement>(".metric-card");
   if(next===focus&&p.open){change();return;}
   const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
   if(document.startViewTransition&&!reduced&&next!=="world"&&!oldCard&&chip){
     chip.style.viewTransitionName="metric-open";
     const transition=document.startViewTransition(()=>{chip.style.viewTransitionName="";change();});
     void transition.finished.catch(()=>{});
   }else{
     const from=(oldCard??chip)?.getBoundingClientRect();
     change();
     const card=shell.current?.querySelector<HTMLElement>(".metric-card");
     if(card&&from&&!reduced&&!oldCard){
       const to=card.getBoundingClientRect();
       card.animate([{opacity:.25,transformOrigin:"top left",transform:`translate(${from.x-to.x}px,${from.y-to.y}px) scale(${from.width/to.width},${from.height/to.height})`},{opacity:1,transform:"none"}],{duration:320,easing:"cubic-bezier(.2,.8,.2,1)"});
     }
   }
 }
 function close(){const prior=focus;p.close();shell.current?.querySelector<HTMLButtonElement>('[data-chip="'+prior+'"]')?.focus({preventScroll:true});}
 function toggle(){if(p.ready&&!p.lost){if(clock.playing)replay.pause();else replay.play();}}
 useEffect(()=>{
   function key(e:KeyboardEvent){
     if(e.altKey||e.ctrlKey||e.metaKey)return;
     if(e.key==="Escape"){if(menu)setMenu(null);else if(metric)close();return;}
     if((e.target as HTMLElement)?.closest("input,select,textarea")||(["ArrowLeft","ArrowRight"].includes(e.key)&&(e.target as HTMLElement)?.closest("[role=tablist]")))return;
     const n=Number(e.key);
     if(n>=1&&n<=7)choose(order[n-1]!);
     else if(e.key===" "){if((e.target as HTMLElement)?.closest("button,a,summary"))return;toggle();}
     else if(["ArrowLeft","ArrowRight","Home","End"].includes(e.key))replay.seek(e.key==="Home"?0:e.key==="End"?day.durationSeconds:clock.seconds+(e.key==="ArrowRight"?300:-300));
     else return;
     e.preventDefault();
   }
   window.addEventListener("keydown",key);return ()=>window.removeEventListener("keydown",key);
 });
 useEffect(()=>{
   if(!menu)return;
   const outside=(e:PointerEvent)=>{if(!(e.target as HTMLElement).closest(".glass-pop,.date-glass,.settings-glass"))setMenu(null);};
   document.addEventListener("pointerdown",outside);return ()=>document.removeEventListener("pointerdown",outside);
 },[menu]);
 function adjacent(delta:number){
   if(!synthetic)return Temporal.PlainDate.from(day.date).add({days:delta}).toString();
   return SYNTHETIC_DAYS[SYNTHETIC_DAYS.findIndex(d=>d.date===day.date)-delta]?.date;
 }
 const dayLabel=day.dateLabel.replace(/, \d{4}$/,"");
 const missing=useMemo(()=>{
   const buckets=focus==="steps"?day.stepTotals:focus==="energy"?day.calorieTotals:focus==="heart"?day.heartMeans:null;
   if(!buckets)return [];
   const ranges:{start:number;end:number}[]=[];
   buckets.forEach((v,i)=>{if(v===null){const last=ranges.at(-1);if(last?.end===i)last.end=i+1;else ranges.push({start:i,end:i+1});}});
   return ranges.map(r=>({left:r.start/buckets.length*100,width:(r.end-r.start)/buckets.length*100}));
 },[day,focus]);
 const failed=p.recorded&&metric&&(metric==="heart"?p.recorded.heartRate:metric==="energy"?p.recorded.calories:p.recorded[metric]).status==="failed";
 return <main style={{"--glass-tint":(p.night?cityLight.night:cityLight.day).glassTint} as CSSProperties} data-refract={/Chrome\//.test(navigator.userAgent)&&CSS.supports("backdrop-filter","url(#glass-refraction) blur(1px)")} ref={shell} className={"glass-shell world"+(p.night?" glass-night":"")} aria-label="Interactive HealthCity scene">
   {p.children}
   <svg className="filter-def" aria-hidden="true"><defs><filter id="glass-refraction"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="1" result="grain"/><feDisplacementMap in="SourceGraphic" in2="grain" scale="2"/></filter></defs></svg>
   <div className="glass-top">
     <div className="glass date-glass"><button className="date-trigger" aria-expanded={menu==="date"} aria-label={"Choose replay date, "+dayLabel} onClick={()=>setMenu(menu==="date"?null:"date")}>
       <span className="brand-symbol"><Icon name="world"/></span><b>HealthCity</b><span className="date-text">{dayLabel}</span><Icon name="down"/></button>
       {([-1,1] as const).map(d=>{const next=adjacent(d);return <button key={d} aria-label={d<0?"Previous day":"Next day"} disabled={!next||(!synthetic&&next>lastEndedReplayDate())} onClick={()=>next&&p.date(next)}><Icon name={d<0?"back":"next"}/></button>;})}
       <span className="source-status"><i/>{status}</span>
     </div>
     <button className="glass settings-glass" aria-label="Settings" aria-expanded={menu==="settings"} onClick={()=>setMenu(menu==="settings"?null:"settings")}><Icon name="settings"/></button>
   </div>
   {menu&&<section className={"glass-pop "+menu+"-pop"} aria-label={menu==="date"?"Replay calendar":"Settings menu"}>
     {menu==="date"?<><label>Replay date {synthetic?<select aria-label="Replay date" value={day.date} onChange={e=>{p.date(e.target.value);setMenu(null);}}>{SYNTHETIC_DAYS.map(d=><option key={d.date} value={d.date}>{d.dateLabel}</option>)}</select>:<input aria-label="Replay date" type="date" max={lastEndedReplayDate()} value={day.date} onChange={e=>{if(e.target.value&&e.target.validity.valid)p.date(e.target.value);}}/>}</label><small>{day.zone}</small></>:
       <><label>Data source<select value={synthetic?"synthetic":"google"} onChange={e=>p.source(e.target.value==="synthetic")}><option value="synthetic">Synthetic data</option><option value="google" disabled={!p.google&&synthetic}>Google Health</option></select></label><button onClick={refresh}>Refresh</button><a href="/auth/status">Account</a>{p.google&&<form method="post" action="/auth/google/start"><button>Sign in with Google</button></form>}</>}
   </section>}
   {message&&!menu&&<div className="shell-toast" role="status">{message}{message==="Updated records available"?<button onClick={refresh}>Refresh</button>:message.startsWith("Drag")?<button aria-label="Dismiss orbit hint" onClick={dismiss}>×</button>:null}</div>}
   {metric&&<MetricCard metric={metric} value={metric==="heart"?day.heartMeans[interval[0]]??null:values[metric]} day={day} seconds={clock.seconds} rhr={rhr} hrvCount={p.towers} source={source}
     week={history.days} weekError={history.error} retry={weekRetry} close={close} weekly={weekly} setWeekly={setWeekly} sleep={p.sleep} wake={p.wake}
     span={interval} sessions={p.sessions} selectSession={p.selectSession} status={failed?"Read failed":!synthetic&&p.load!=="ready"?status:""}/>}
   <div className="glass-bottom"><nav className="glass metric-dock" aria-label="Camera focus">{order.map(m=><button key={m} data-chip={m} className={"m-"+m} aria-label={focusLabels[m]} aria-description={m==="world"?undefined:values[m]===null?"No data":formatValue(values[m],m)} aria-pressed={focus===m} data-missing={m!=="world"&&values[m]===null}
     onClick={()=>choose(m)}><Icon name={m}/><span>{focusLabels[m]}</span>{m!=="world"&&<strong>{formatValue(values[m],m,true)}</strong>}</button>)}</nav>
     <div className="glass playback-glass"><button className="play-action" aria-label={clock.playing?"Pause":"Play"} disabled={!p.ready||p.lost||clock.seconds>=day.durationSeconds} onClick={toggle}><Icon name={clock.playing?"pause":"play"}/></button>
     <output aria-label="Replay clock">{day.replayLabel(clock.seconds)}</output><div className="time-track" style={{"--played":clock.seconds/day.durationSeconds*100+"%"} as CSSProperties}>
     <div className="track-fill">{missing.map(r=><i key={r.left} style={{left:r.left+"%",width:r.width+"%"}}/>)}</div><input aria-label="Replay time" type="range" min="0" max={day.durationSeconds} value={Math.floor(clock.seconds)} onChange={e=>replay.seek(Number(e.target.value))} aria-valuetext={day.replayLabel(clock.seconds)}/>
     <div className="time-ticks"><span>00:00</span><span>12:00</span><span>24:00</span></div></div>
     <button className="speed-action" aria-label={"Playback speed "+clock.speed+"×"} onClick={()=>replay.setSpeed(clock.speed===60?240:clock.speed===240?480:60)}>{clock.speed}×</button></div>
   </div>
 </main>;
}
function accumulated(buckets:(number|null)[],seconds:number){
 const completed=Math.floor(seconds/300);
 if(completed===0)return buckets[0]==null?null:0;
 return sum(buckets.slice(0,completed));
}
