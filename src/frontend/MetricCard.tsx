import {useEffect,useMemo,useRef,useState,type ReactNode} from "react";
import {asleepSeconds,elapsedSeconds,type DaySleepVoyage,type SleepSpan} from "../core/sleep-replay.ts";
import {stepsAt,trafficAt,type ReplayDay} from "../core/representative-day.ts";
import {reservoirLevel,type canonicalRhr} from "../core/rhr.ts";
import {chartSpans} from "./voyage-chart-data.ts";
import {destination} from "../scene/sleep/island-preview.ts";
import {Timeline,RouteMap} from "./VoyageChart.tsx";
import {sleepFormatter,sleepLabel} from "./SleepDetails.tsx";
import {SevenDayBars,SevenDayDots,SevenDayRange,SevenDayStack,IntradayLine,HourlyBars} from "./charts/MetricChart.tsx";
import {compareWeek,formatValue,methodLabel,names,sum,units,weekPoint,type ChartPoint,type Metric,type Summary} from "./metric-values.ts";

export type Rhr=ReturnType<typeof canonicalRhr>|{status:"failed"};
interface Props{
  metric:Metric;day:ReplayDay;seconds:number;value:number|null;rhr:Rhr;hrvCount:number|null;source:string;
  week?:Summary[];weekError?:boolean;retry:()=>void;close:()=>void;weekly:boolean;setWeekly:(v:boolean)=>void;
  sleep:DaySleepVoyage|null;sessions:DaySleepVoyage[];selectSession:(id:string)=>void;wake?:SleepSpan;
  span:[number,number];status:string;
}
function Facts({rows}:{rows:[string,ReactNode][]}){return <dl className="glass-facts">{rows.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;}
function sleepContent(sleep:DaySleepVoyage,seconds:number,wake:SleepSpan|undefined,chosen:number|null,pick:(i:number|null)=>void){
  const {session}=sleep,t=seconds+sleep.offset,total=elapsedSeconds(session),until=Math.max(0,Math.min(total,t));
  const clock=sleepFormatter(sleep,{hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
  const spans=chartSpans(session),land=asleepSeconds(session)>0?destination(session):null;
  const selected=spans.find(s=>wake&&s.start===wake.start&&s.stage==="AWAKE")??spans.find(s=>s.index===chosen&&s.start<until);
  const current=selected??spans.find(s=>s.start<=t&&s.end>t);
  const stages=["DEEP","LIGHT","REM","ASLEEP"] as const;
  const minutes=stages.map(stage=>spans.reduce((n,s)=>n+(s.stage===stage?Math.max(0,Math.min(until,s.end)-s.start):0),0));
  const hours=Array.from({length:Math.ceil(total/3600)},(_,i)=>(i+1)*3600-(Number(clock(0).slice(-2))*60)).filter(v=>v>0&&v<total);
  const wakes=spans.filter(s=>s.stage==="AWAKE"&&s.start<until);
  const legend=<div className="stage-legend">{stages.map((s,i)=><span key={s}><i style={{background:"var(--"+(s==="ASLEEP"?"unclassified":s.toLowerCase())+")"}}/>{s==="ASLEEP"?"Unclassified":sleepLabel(s)} · {formatValue(minutes[i]!, "sleep",true)}</span>)}</div>;
  return {legend,today:<><p>{current?sleepLabel(current.stage)+" · "+clock(current.start):t<0?"Before departure":"Arrived"}</p>
    <div className="stage-stack">{stages.map((s,i)=><i key={s} style={{flex:minutes[i],background:"var(--"+(s==="ASLEEP"?"unclassified":s.toLowerCase())+")"}}/>)}</div>
    {legend}<Timeline spans={spans} total={total} hours={hours} clock={clock} until={until} chosen={selected?.index??null} pick={pick}/>
</>,
    details:<><h3>Route</h3><RouteMap sleep={sleep} spans={spans} land={land} time={t} clock={clock} selected={selected}/>
    <Facts rows={[["Sleep start",clock(0)],["Woke up",until===total?clock(total):"—"],["Awakenings",wakes.map(s=>clock(s.start)).join(", ")||"None"],
      ...(session.shortAwakenings?.length?[["Short awakenings",session.shortAwakenings.filter(s=>s.start<until).map(s=>clock(s.start)).join(", ")||"None"] as [string,string]]:[]),["Island area",land?Math.round(land.area).toLocaleString()+" m²":"—"]]}/></>};
}
export function MetricCard(p:Props){
  const {metric,day,seconds,weekly}=p;
  const [expanded,setExpanded]=useState(false),[chosen,pick]=useState<number|null>(null);
  const dragged=useRef(false),touch=useRef<number|null>(null),panel=useRef<HTMLElement>(null);
  useEffect(()=>{panel.current?.scrollTo(0,0);panel.current?.querySelector<HTMLElement>("h2")?.focus({preventScroll:true});},[metric]);
  const week=useMemo(()=>p.week?.map(d=>weekPoint(d,metric)),[p.week,metric]);
  const comparison=week?compareWeek(week,metric):null;
  const daily=metric==="hrv"||metric==="rhr",cursor=seconds/day.durationSeconds;
  const raw=metric==="steps"?day.stepTotals:metric==="energy"?day.calorieTotals:day.heartMeans;
  const pinned=metric==="heart"&&p.span[0]!==Math.min(raw.length-1,Math.floor(seconds/300));
  const chartCursor=pinned?(p.span[0]+.5)/raw.length:cursor;
  const series=useMemo(()=>{
    const grouped=metric==="heart"?1:12;
    return Array.from({length:Math.ceil(raw.length/grouped)},(_,i)=>{
      const values=raw.slice(i*grouped,(i+1)*grouped);
      return {label:day.replayLabel(i*grouped*300),value:sum(values),detail:"",low:null,high:null,parts:undefined} satisfies ChartPoint;
    });
  },[raw,metric,day]);
  const weeklyChart=metric==="sleep"?SevenDayStack:metric==="heart"?SevenDayRange:metric==="rhr"?SevenDayDots:SevenDayBars;
  const Weekly=weeklyChart,Today=metric==="heart"?IntradayLine:HourlyBars;
  const sleep=useMemo(()=>metric==="sleep"&&p.sleep?sleepContent(p.sleep,seconds,p.wake,chosen,pick):null,[metric,p.sleep,seconds,p.wake,chosen]);
  const total=(metric==="steps"||metric==="energy")?sum(raw):null,method=p.rhr.status==="value"?methodLabel(p.rhr.method):"—";
  const steps=stepsAt(day,seconds),energy=trafficAt(day,seconds);
  const facts:[string,ReactNode][]=metric==="rhr"?[["Method",method],["Source",p.source],["Water level",p.value===null?"—":reservoirLevel(p.value).toFixed(1)+" m above the toe"]]:
    metric==="hrv"?[["Tower count",p.hrvCount??"—"],["Source",p.source]]:
    metric==="heart"?[["Interval",day.replayLabel(p.span[0]*300)+" – "+day.replayLabel(p.span[1]*300)],["Source",p.source]]:
    metric==="steps"?[["Five-minute steps",steps.steps??"—"],["Figures on the walk",steps.pedestrianCount]]:
    [["Five-minute energy",energy.meanKcalPerMinute===null?"—":energy.meanKcalPerMinute+" kcal/min"],["Vehicles on the road",energy.vehicleCount]];
  const note={rhr:"A daily summary. It is not your heart rate at this moment. The water level changes by 0.4 m per bpm within the display range.",
    hrv:"One tower per 5 ms, rounded down."+(p.hrvCount!==null&&p.hrvCount>30?" The district shows 30 towers.":""),
    heart:"Five-minute averages.",steps:"One figure per 80 steps, up to six figures.",energy:"Total energy includes basal metabolism. One vehicle per 1.2 kcal/min, up to four vehicles.",sleep:""}[metric];
  return <aside ref={panel} className={"glass metric-card m-"+metric+(expanded?" expanded":"")} aria-label={names[metric]} data-metric={metric}>
    <button className="sheet-handle" aria-label={expanded?"Collapse sheet":"Expand sheet"} aria-expanded={expanded} onClick={()=>{if(!dragged.current)setExpanded(!expanded);dragged.current=false;}}
      onPointerDown={e=>{dragged.current=false;touch.current=e.clientY;e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={e=>{if(touch.current!==null&&Math.abs(e.clientY-touch.current)>16){dragged.current=true;setExpanded(e.clientY<touch.current);e.preventDefault();}touch.current=null;}}><i/></button>
    <div className="card-body" key={metric}>
      <div className="metric-heading"><h2 tabIndex={-1}>{names[metric]}</h2><button className="round-action" aria-label={"Close "+names[metric]} onClick={p.close}>×</button></div>
      {(metric==="steps"||metric==="energy")&&<p className="metric-context">By {day.replayLabel(seconds)}</p>}
      <div className="metric-value">{formatValue(p.value,metric)}{p.value!==null&&units[metric]&&<small>{units[metric]}</small>}</div>
      {total!==null&&cursor<1&&<p className="of-total">Day total · {formatValue(total,metric)} {units[metric]}</p>}
      {comparison&&<p className="comparison">{!daily&&cursor<1&&week?.at(-1)?.value!=null?"Full day · ":""}{comparison.direction&&<span className={"trend-"+comparison.direction} aria-hidden="true">{comparison.direction==="up"?"▲ ":"▼ "}</span>}{comparison.text}</p>}
      <p className="metric-context">{day.dateLabel.split(", ").slice(0,2).join(", ")}{metric!=="steps"&&metric!=="energy"&&" · "+(daily?(metric==="rhr"&&p.rhr.status==="value"?method:p.source):day.replayLabel(seconds))}</p>
      {p.status&&<p role="status">{p.status}</p>}
      {metric==="rhr"&&!p.status&&p.rhr.status==="none"&&<p>No RHR data</p>}
      {metric==="rhr"&&p.rhr.status==="value"&&(p.rhr.bpm<40||p.rhr.bpm>80)&&<p>Outside the gauge range · 40–80 bpm</p>}
      {metric==="sleep"&&p.sessions.length>1&&<div className="session-picker" role="group" aria-label="Sleep session">{p.sessions.map(s=><button key={s.session.id} aria-pressed={s.session.id===p.sleep?.session.id} onClick={()=>p.selectSession(s.session.id)}>{sleepFormatter(s,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})(0)}</button>)}</div>}
      {!daily&&<div className="chart-tabs" role="tablist" aria-label="Chart period">{["Today","7 days"].map((v,i)=><button type="button" role="tab" id={"period-"+i} aria-controls="metric-panel" key={v} aria-selected={weekly===Boolean(i)} tabIndex={weekly===Boolean(i)?0:-1}
        onKeyDown={e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();p.setWeekly(!weekly);(e.currentTarget.parentElement!.children[1-i] as HTMLElement).focus();}}} onClick={()=>p.setWeekly(Boolean(i))}>{v}</button>)}</div>}
      <section className="chart-panel" id="metric-panel" aria-labelledby={daily?undefined:"period-"+Number(weekly)} role={daily?undefined:"tabpanel"} key={daily?"daily":String(weekly)}>
        <h3>{daily||weekly?"Last 7 days":metric==="sleep"?"Sleep stages":metric==="heart"?"Five-minute heart rate":"Hourly "+names[metric].toLowerCase()}</h3>
        {daily||weekly?<>{weekly&&metric==="sleep"&&<div className="stage-legend">{["Deep","Light","REM","Unclassified"].map(stage=><span key={stage}><i style={{background:"var(--"+stage.toLowerCase()+")"}}/>{stage}</span>)}</div>}{week?<Weekly metric={metric} points={week} avg={comparison?.avg}/>:p.weekError?<p>Could not load the last 7 days <button onClick={p.retry}>Retry</button></p>:<div className="chart-skeleton" aria-label="Loading history"/>}</>:
        metric==="sleep"?sleep?.today??<p>No sleep record</p>:<Today points={series} metric={metric} cursor={chartCursor}/>}
      </section>
      {p.weekError&&!daily&&!weekly&&<p>Could not load the last 7 days <button onClick={p.retry}>Retry</button></p>}
      {metric==="sleep"?sleep?.details:<Facts rows={facts}/>}
      {note&&<p className="metric-note">{note}</p>}
      {metric==="rhr"&&p.week&&new Set(p.week.flatMap(d=>d.rhr.status==="value"?[d.rhr.method]:[])).size>1&&<p className="metric-note">Methods differ across these days.</p>}
    </div>
  </aside>;
}
