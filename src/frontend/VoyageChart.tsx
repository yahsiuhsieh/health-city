import { memo,useEffect,useMemo,useRef,useState } from "react";
import type { KeyboardEvent } from "react";
import { breakwaterArms } from "../scene/city/harbor-plan.ts";
import { destination } from "../scene/sleep/island-preview.ts";
import { stageMinutes,ISLAND_M2_PER_ASLEEP_MINUTE } from "../scene/sleep/island-shape.ts";
import { SYNTHETIC_SESSION as session,asleepSeconds,elapsedSeconds,type SleepStage } from "../scene/sleep/session.ts";
import { voyageState } from "../scene/sleep/timeline.ts";
import { chartPoint,chartPosition,chartPath,chartSpans,fractionAt,type ChartSpan } from "./voyage-chart-data.ts";
import { sleepLabel,sleepStamp } from "./SleepDetails.tsx";
import "./voyage-chart.css";

const spans=chartSpans(session),elapsed=elapsedSeconds(session),asleep=asleepSeconds(session),minutes=stageMinutes(session);
const stages=["LIGHT","DEEP","REM","ASLEEP"] as const;
const colors={LIGHT:"#5aa9e6",DEEP:"#1f3d7a",REM:"#9b6bd3",ASLEEP:"#9aa3ad"};
function wallTime(t:number){
  const m=Math.floor((session.startSecondOfDay+t)/60);
  return [Math.floor(m/60)%24,m%60].map(n=>String(n).padStart(2,"0")).join(":");
}
const hours:number[]=[];
for(let t=(3600-session.startSecondOfDay%3600)%3600;t<=elapsed;t+=3600)hours.push(t);
function worldPath(points:readonly (readonly [number,number])[]){
  return "M"+points.map(([x,z])=>{const p=chartPoint(x,z);return p.x.toFixed(1)+" "+p.y.toFixed(1);}).join("L");
}

const ChartCoast=memo(function ChartCoast(){
  const land=destination(),reef=worldPath(land.reef.polygon)+"Z",cay=worldPath(land.polygon)+"Z";
  const c=chartPoint(...land.reef.center);
  return <g aria-hidden="true" className="chart-coast">
    <defs><pattern id="chart-grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" className="chart-grid-line"/></pattern></defs>
    <rect width="600" height="220" className="chart-water"/><rect width="600" height="220" fill="url(#chart-grid)"/>
    {[1.56,1.35,1.16,1].map((k,i)=><path key={k} d={reef} className={"chart-depth depth-"+i} transform={`translate(${c.x} ${c.y}) scale(${k}) translate(${-c.x} ${-c.y})`}/>)}
    {[39,23,10,0].map((d,i)=><path key={d} transform={`translate(${d} 0)`} className={i===3?"chart-land":"chart-depth depth-"+i}
      d="M-65 -10H52Q65 13 55 32T63 69L79 87 82 108 73 114H37L31 119H19L17 127 26 140 21 150Q18 165 30 179T35 229H-65Z"/>)}
    <path d="M25 80L58 66M8 59L42 44M11 91L62 70M35 94L53 85M18 156L8 175" className="chart-terrain"/>
    {breakwaterArms.map((arm,i)=><path key={i} d={worldPath(arm)} className="chart-pier"/>)}
    <path d={cay} className="chart-land"/>
    <path d={cay} className="chart-island-interior" transform={`translate(${chartPoint(...land.center).x*.28} ${chartPoint(...land.center).y*.28}) scale(.72)`}/>
    <path d={worldPath([land.shore,land.pier])} className="chart-pier"/>
    <text x="16" y="50" className="chart-place">City harbor</text><text x="588" y="31" textAnchor="end" className="chart-place">Sleep island</text>
    <g transform="translate(557 178)" className="chart-compass"><path d="M-14 0H14M0 -16V16"/><path d="M0 -13L4 6 0 3 -4 6Z" className="chart-arrow"/><text y="-21" textAnchor="middle">N</text></g>
  </g>;
});
function activate(e:KeyboardEvent<SVGGElement>,select:()=>void){
  if(e.key==="Enter"||e.key===" "){e.preventDefault();select();}
}
function intervalLabel(s:ChartSpan){return sleepLabel(s.stage)+" · "+wallTime(s.start)+"–"+wallTime(s.end)+" · "+(s.end-s.start)/60+" min";}
function duration(seconds:number){return Math.floor(seconds/3600)+" h "+Math.floor(seconds/60)%60+" min";}

export function VoyageChart({time,close}:{time:number;close:()=>void}){
  const [chosen,setChosen]=useState<number|null>(null);
  const closeButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{closeButton.current?.focus({preventScroll:true});},[]);
  const reached=fractionAt(spans,time);
  const current=spans.find(s=>time>=s.start&&time<s.end);
  const selected=chosen===null?undefined:spans[chosen];
  const selectionVisible=selected && (selected.stage==="AWAKE"?selected.start<=time:selected.start<time);
  const inspected=selectionVisible?selected:current;
  const ship=useMemo(()=>voyageState(session,time),[time]);
  const marker=ship.phase==="returning"||ship.phase==="moored"?{...chartPoint(ship.x,ship.z),angle:-ship.yaw*180/Math.PI}:chartPosition(reached);
  const status=ship.phase==="returning"?"Returning to harbor":ship.phase==="arrived"?"At the island":ship.phase==="moored"||ship.phase==="harbor"?"At the harbor":sleepLabel(current!.stage);
  const pick=(index:number)=>setChosen(index);
  return <aside aria-label="Voyage chart" className="voyage-chart" onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();close();}}}>
    <div className="voyage-heading"><div><h2>Voyage chart</h2><p>{sleepStamp(0)} – {sleepStamp(elapsed)} · Chicago</p></div>
      <button ref={closeButton} aria-label="Close voyage chart" onClick={close}>×</button></div>
    <div className="voyage-body"><div className="voyage-plot">
      <svg viewBox="0 0 600 220" role="group" aria-label="Sleep voyage track">
        <ChartCoast/>
        {hours.filter(t=>t<=time).map((t,i)=>{
          const p=chartPosition(fractionAt(spans,t));
          return <g key={t} transform={`translate(${p.x} ${p.y})`} className={"chart-tick "+(i%2?"minor":"")} aria-hidden="true">
            <path d="M0 5v8"/><text y="27" textAnchor="middle">{wallTime(t)}</text></g>;
        })}
        {spans.filter(s=>s.stage!=="AWAKE"&&s.start<time).map(s=>{
          const stage=s.stage as Exclude<SleepStage,"AWAKE">,d=chartPath(s.from,Math.min(reached,s.to));
          return <g key={s.index} role="button" tabIndex={0} aria-label={intervalLabel(s)} aria-pressed={inspected===s}
            className="chart-segment" onClick={()=>pick(s.index)} onKeyDown={e=>activate(e,()=>pick(s.index))}>
            <path d={d} className="chart-segment-edge"/><path d={d} stroke={colors[stage]} strokeWidth="5" strokeDasharray={stage==="ASLEEP"?"5 4":undefined}/>
            <path d={d} className="chart-hit"/></g>;
        })}
        {spans.filter(s=>s.stage==="AWAKE"&&s.start<=time).map(s=>{
          const p=chartPosition(s.from);
          return <g key={s.index} transform={`translate(${p.x} ${p.y})`} className="chart-anchor" role="button" tabIndex={0}
            aria-label={intervalLabel(s)} aria-pressed={inspected===s} onClick={()=>pick(s.index)} onKeyDown={e=>activate(e,()=>pick(s.index))}>
            <path className="chart-leader" d="M0 -4v-22"/><g transform="translate(0 -36)">
              <rect className="chart-annotation" x="-47" y="-10" width="94" height="20" rx="5"/>
              <g transform="translate(-35 0)" className="chart-anchor-icon"><circle cy="-5" r="1.7"/><path d="M0 -3v9m-5-5q1 5 5 5t5-5M-3-1h6"/></g>
              <text x="6" y="4" textAnchor="middle">{wallTime(s.start)} · {(s.end-s.start)/60} min</text></g></g>;
        })}
        <g aria-label={"Boat position · "+status} transform={`translate(${marker.x} ${marker.y}) rotate(${marker.angle})`} className="chart-boat">
          <circle r="10"/><path d="M-6-3.6H1.5L7 0 1.5 3.6H-6Z"/></g>
      </svg>
      <p className="voyage-reading"><span>{selectionVisible?"Selected interval":"Replay · "+wallTime(time)}</span>
        <strong>{inspected?intervalLabel(inspected):status}</strong></p>
    </div><div className="voyage-stages"><h3>Time asleep</h3>
      <div className="voyage-stack" aria-hidden="true">{stages.map(stage=><i key={stage} style={{flexGrow:minutes[stage],background:colors[stage]}}/>)}</div>
      <table aria-label="Sleep stage proportions"><thead><tr><th>Stage</th><th>Min</th><th>Share</th></tr></thead>
        <tbody>{stages.map(stage=><tr key={stage}><th scope="row"><i style={{background:colors[stage]}}/>{stage==="ASLEEP"?"Unclassified":stage==="REM"?"REM":stage==="LIGHT"?"Light":"Deep"}</th>
          <td>{minutes[stage]}</td><td>{(minutes[stage]*6000/asleep).toFixed(1)}%</td></tr>)}</tbody></table>
    </div></div>
    <dl className="voyage-totals"><div><dt>Elapsed time</dt><dd>{duration(elapsed)}</dd></div><div><dt>Time asleep</dt><dd>{duration(asleep)}</dd></div>
      <div><dt>Island area</dt><dd>{(asleep/60*ISLAND_M2_PER_ASLEEP_MINUTE).toLocaleString("en-US")} m²</dd></div></dl>
  </aside>;
}
