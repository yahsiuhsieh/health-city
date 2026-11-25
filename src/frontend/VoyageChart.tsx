import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { REPLAY_ZONE } from "../core/daily-hrv.ts";
import { coastSegments } from "../scene/coastline.ts";
import { breakwaterArms } from "../scene/city/harbor-plan.ts";
import { destination } from "../scene/sleep/island-preview.ts";
import { outerReef } from "../scene/sleep/outer-reef.ts";
import { ROUTE_LENGTH } from "../scene/sleep/route.ts";
import { SYNTHETIC_SESSION as session, elapsedSeconds, type SleepStage } from "../scene/sleep/session.ts";
import { voyageState } from "../scene/sleep/timeline.ts";
import { chartPath, chartPoint, chartPosition, chartSpans, type ChartSpan } from "./voyage-chart-data.ts";
import "./voyage-chart.css";

const spans = chartSpans(session);
const total = elapsedSeconds(session);
const names = { AWAKE:"Awake", REM:"REM", LIGHT:"Light", DEEP:"Deep", ASLEEP:"Unclassified" };
const rows = { AWAKE:0, REM:1, LIGHT:2, DEEP:3, ASLEEP:2 };
const stages = ["LIGHT", "DEEP", "REM", "ASLEEP"] as const;
const paint = (stage:SleepStage) => stage === "ASLEEP" ? "var(--hatch)" : "var(--"+stage.toLowerCase()+")";
const duration = (seconds:number) => Math.floor(seconds/3600)+" h "+Math.floor(seconds/60)%60+" min";
function clock(t:number) {
  const m = Math.floor((session.startSecondOfDay+t)/60)%1440;
  return [Math.floor(m/60), m%60].map(n=>String(n).padStart(2,"0")).join(":");
}
function interval(span:ChartSpan, until:number) {
  const end = Math.min(span.end,until);
  return names[span.stage]+" · "+clock(span.start)+"–"+clock(end)+" · "+Math.floor((end-span.start)/60)+" min";
}
const date = (value:string, options:Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US",{...options,timeZone:"UTC"}).format(new Date(value+"T12:00:00Z"));
const hours = Array.from({length:Math.ceil(total/3600)},(_,i)=>(i+1)*3600-session.startSecondOfDay%3600).filter(t=>t<total);
function outline(points:readonly (readonly [number,number])[]) {
  return "M"+points.map(([x,z])=>{ const p=chartPoint(x,z); return p.x.toFixed(1)+" "+p.y.toFixed(1); }).join("L");
}
const Coast = memo(function Coast(){
  const land=destination();
  return <g strokeLinejoin="round">
    <path d={outline(coastSegments.flatMap(s=>s.points))+"Z"} fill="#e6e1cf" stroke="#cbc4ab"/>
    {breakwaterArms.map((arm,i)=><path key={i} d={outline(arm)} stroke="#889c95" strokeWidth="3" fill="none"/>)}
    {[...outerReef.patches.map(p=>p.polygon),land.reef.polygon].map((poly,i)=><path key={i} d={outline(poly)+"Z"} fill="#d7ebe9" stroke="#b9d6d3"/>)}
    <path d={outline(land.polygon)+"Z"} fill="#e6e1cf" stroke="#cbc4ab"/>
    <path d={outline([land.shore,land.pier])} stroke="#899a95" strokeWidth="3"/>
  </g>;
});
function RouteMap({time,selected}:{time:number;selected?:ChartSpan}){
  const ship=voyageState(session,time),reached=ship.s;
  const marker=chartPoint(ship.x,ship.z),bow=chartPoint(ship.x+Math.cos(ship.yaw),ship.z-Math.sin(ship.yaw));
  const angle=Math.atan2(bow.y-marker.y,bow.x-marker.x)*180/Math.PI;
  const ring=selected && chartPosition((selected.s0+Math.min(reached,selected.s1))/2);
  return <div className="map"><svg viewBox="-14 -14 610 245" role="img" aria-label="Route from the harbor to the sleep island">
    <Coast/><path d={chartPath(0,ROUTE_LENGTH)} stroke="#acbfb9" fill="none" strokeDasharray="3 6"/>
    {spans.filter(s=>s.start<time && s.stage!=="AWAKE").map(s=><g key={s.index}><path d={chartPath(s.s0,Math.min(s.s1,reached))} fill="none" stroke="var(--surface)" strokeWidth="8"/><path d={chartPath(s.s0,Math.min(s.s1,reached))}
      fill="none" stroke={s.stage==="ASLEEP"?"var(--unclassified)":paint(s.stage)} strokeDasharray={s.stage==="ASLEEP"?"4 3":undefined}
      strokeWidth="4" className="route-leg"/></g>)}
    {spans.filter(s=>s.stage==="AWAKE" && s.start<=time).map(s=>{const p=chartPosition(s.s0);
      return <g key={s.index}><circle cx={p.x} cy={p.y} r="6" fill="white" stroke="var(--awake)" strokeWidth="2"/><title>{interval(s,time)}</title></g>;})}
    {ring && <circle className="selection-ring" cx={ring.x} cy={ring.y} r="10" fill="none" stroke="var(--ink)" strokeWidth="2"/>}
    <g className="chart-boat" transform={`translate(${marker.x} ${marker.y}) rotate(${angle})`}>
      <circle r="7.5" fill="white" stroke="var(--ink)"/><path d="M-4-2.5H1L5 0 1 2.5H-4Z" fill="#a8513b"/></g>
  </svg><div className="map-key"><span>Harbor</span><span>Outer reef</span><span>Sleep island</span></div></div>;
}
function Timeline({until,chosen,pick}:{until:number;chosen:number|null;pick:(index:number)=>void}){
  const [hover,setHover]=useState<number|null>(null),[focus,setFocus]=useState<number|null>(null);
  const shown=spans.filter(s=>s.start<until),tip=shown.find(s=>s.index===(hover??focus));
  const x=(t:number)=>100*t/total+"%";
  return <div className="timeline" role="group" aria-label="Sleep stage timeline">
    <div className="row-labels">{(["AWAKE","REM","LIGHT","DEEP"] as const).map(s=><span key={s}>{s==="AWAKE"?"⚓ ":""}{names[s]}</span>)}</div>
    <div className="time-plot">
      <span className="first-hour">{clock(0)}</span>
      {hours.map((t,i)=><div className="gridline" style={{left:x(t)}} key={t}><span className={i%2===0?"minor":""}>{clock(t)}</span></div>)}
      {shown.map((s,i)=>{const previous=shown[i-1],row=rows[s.stage];
        return <div key={s.index}>{previous && <i className="riser" style={{left:x(s.start),top:11+30*Math.min(row,rows[previous.stage]),height:30*Math.abs(row-rows[previous.stage])}}/>}
          <button className="segment" aria-label={interval(s,until)} aria-pressed={chosen===s.index}
            onClick={()=>pick(s.index)} onMouseEnter={()=>setHover(s.index)} onMouseLeave={()=>setHover(null)}
            onFocus={()=>setFocus(s.index)} onBlur={()=>setFocus(null)} style={{left:x(s.start),width:x(Math.min(until,s.end)-s.start),top:30*row,background:paint(s.stage)}}/></div>;})}
      {until<total && <div className="future" style={{left:x(until)}}><span>{clock(until)}</span></div>}
      {tip && <div role="tooltip" className="interval-tip" style={{top:rows[tip.stage]*30,left:`clamp(76px, ${x((tip.start+Math.min(until,tip.end))/2)}, 100% - 76px)`}}>{interval(tip,until)}</div>}
    </div></div>;
}

export function VoyageChart({time,close}:{time:number;close:()=>void}){
  const [chosen,pick]=useState<number|null>(null);
  const panel=useRef<HTMLElement>(null),closeButton=useRef<HTMLButtonElement>(null);
  const until=Math.max(0,Math.min(total,time)),done=until===total;
  const current=spans.find(s=>s.start<=time && s.end>time);
  const selected=chosen===null?undefined:spans.find(s=>s.index===chosen && s.start<until);
  useEffect(()=>{if(chosen!==null && !selected)pick(null);},[chosen,selected]);
  useEffect(()=>{
    const onEscape=(event:KeyboardEvent)=>{if(event.key==="Escape")close();};
    document.addEventListener("keydown",onEscape);
    return ()=>document.removeEventListener("keydown",onEscape);
  },[close]);
  useLayoutEffect(()=>{
    const root=panel.current!;
    closeButton.current?.focus({preventScroll:true});
    const resize=new ResizeObserver(()=>root.toggleAttribute("data-scroll",root.scrollHeight>root.clientHeight+1));
    resize.observe(root);resize.observe(root.firstElementChild!);
    const nativeReveal=CSS.supports("animation-timeline: view()");
    root.toggleAttribute("data-native-reveal",nativeReveal);
    const observer=nativeReveal?null:new IntersectionObserver(entries=>{
      for(const e of entries){
        const entryHeight=Math.min(e.boundingClientRect.height,root.clientHeight);
        const progress=entryHeight?Math.min(1,e.intersectionRect.height/(entryHeight*.7)):0;
        (e.target as HTMLElement).style.setProperty("--p",String(progress));
      }
    },{root,threshold:Array.from({length:36},(_,i)=>i/35)});
    root.querySelectorAll(".reveal").forEach(el=>observer?.observe(el));
    return ()=>{resize.disconnect();observer?.disconnect();};
  },[]);
  const seconds:Record<SleepStage,number>={LIGHT:0,DEEP:0,REM:0,AWAKE:0,ASLEEP:0};
  for(const s of spans)seconds[s.stage]+=Math.max(0,Math.min(until,s.end)-s.start);
  const asleep=stages.reduce((sum,s)=>sum+seconds[s],0),wakes=spans.filter(s=>s.stage==="AWAKE" && s.start<until);
  const legend=stages.filter(s=>s!=="ASLEEP"||seconds.ASLEEP>0);
  const share=(s:SleepStage)=>(asleep?seconds[s]*100/asleep:0).toFixed(1)+"%";
  return <aside ref={panel} aria-label="Sleep voyage" className="voyage-chart"><div>
    <header className="head"><div><p className="eyebrow">Sleep voyage</p><h2 className="title">Night of {date(session.startDate,{weekday:"short",month:"short",day:"numeric"})}</h2>
      <p className="meta">{clock(0)} → {clock(total)} {date(session.endDate,{weekday:"short"})} · {REPLAY_ZONE}</p></div>
      <button className="close" ref={closeButton} onClick={close} aria-label="Close sleep voyage">×</button></header>
    {(selected||current) && <div className="status"><i style={{background:paint((selected??current)!.stage)}}/>
      {selected?<><b>{interval(selected,until)}</b><button onClick={()=>pick(null)}>Clear</button></>:<><b>{current!.stage==="AWAKE"?"⚓ ":""}{names[current!.stage]}</b> since {clock(current!.start)} · replay {clock(time)}</>}</div>}
    <div className="hero"><div><p className="hero-value">{duration(asleep)}<small>{done?"asleep":"asleep so far"}</small></p>
      <p className="hero-sub">{duration(until)} {done?"in bed":"since departure"} · {wakes.length} awakening{wakes.length===1?"":"s"}{wakes.length?", "+Math.floor(seconds.AWAKE/60)+" min":""}</p></div>
      <dl className="island"><svg width="34" height="22" aria-hidden="true"><ellipse cx="17" cy="12" rx="16" ry="9" fill="#d7ebe9"/><ellipse cx="18" cy="11" rx="8" ry="4.5" fill="#e6e1cf"/><circle cx="16" cy="9" r="3" fill="#5b8a55"/></svg>
      <div><dt>{done?"Island":"Island on arrival"}</dt><dd>{done?destination().area.toLocaleString("en-US")+" m²":clock(total)}</dd></div></dl></div>
    <section className="reveal"><h3>Stages</h3><div className="stack" aria-hidden="true">{legend.filter(s=>seconds[s]>0).map(s=><span key={s} style={{flex:seconds[s],background:paint(s)}}/>)}</div>
      <ul className="legend">{legend.map(s=><li key={s}><i style={{background:paint(s)}}/><span className="name">{names[s]}</span><span className="value">{duration(seconds[s])}<span className="share">{share(s)}</span></span></li>)}</ul>
      <table className="sr-only" aria-label="Sleep stage proportions"><tbody>{legend.map(s=><tr key={s}><th scope="row">{names[s]}</th><td>{Math.floor(seconds[s]/60)} min</td><td>{share(s)}</td></tr>)}</tbody></table></section>
    <section className="reveal"><h3>Timeline</h3><Timeline until={until} chosen={selected?.index??null} pick={pick}/></section>
    <div className="lower reveal"><section><h3>Route</h3><RouteMap time={time} selected={selected}/></section><section><h3>Details</h3>
      <dl className="facts"><div><dt>Sleep start</dt><dd>{clock(0)}</dd></div><div><dt>Woke up</dt><dd>{done?clock(total):"—"}</dd></div>
      <div><dt>Awakenings</dt><dd>{wakes.length?wakes.map(s=><div key={s.index}>{clock(s.start)}<small>{Math.floor((Math.min(s.end,until)-s.start)/60)} min · boat anchored</small></div>):"None"}</dd></div>
      <div><dt>Route</dt><dd>{(ROUTE_LENGTH/1000).toFixed(1)} km<small>Harbor to island</small></dd></div></dl></section></div>
  </div></aside>;
}
