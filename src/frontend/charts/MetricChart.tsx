import {useState,type CSSProperties} from "react";
import {formatValue,names,units,type ChartPoint,type Metric} from "../metric-values.ts";

type Shape="bars"|"dots"|"range"|"stack"|"line";
interface Props {points:ChartPoint[];metric:Metric;avg?:number|null;cursor?:number;weekly?:boolean;}
const W=340,L=38,R=326,T=16,B=79;
export function AverageLine({y,end,label}:{y:number;end:number;label:string}){
  return <g className="avg-line" pointerEvents="none"><path d={`M${L} ${y}H${end}`}/><text x={L+2} y={y-6}>{label}</text></g>;
}
function ChartTooltip({point,metric,weekly,range}:{point:ChartPoint;metric:Metric;weekly:boolean;range:boolean}){
  const date=weekly?new Date(point.label+"T12:00:00Z").toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"UTC"}):point.label;
  const title=point.value===null?(point.detail||"—"):formatValue(point.value,metric);
  return <output className="chart-reading">
    <span><small>{date}{range&&point.value!==null?" · Mean":""}</small><strong>{title} {point.value!==null&&<em>{units[metric]}</em>}</strong></span>
    {range&&point.low!==null&&point.high!==null&&<span className="chart-extrema"><small>Low / High</small><b>{formatValue(point.low,metric)} / {formatValue(point.high,metric)}</b></span>}
    {(metric==="rhr"&&point.value!==null)&&point.detail&&<small>{point.detail}</small>}
    {point.parts&&<small>{point.parts.map((v,i)=>v>0?["Deep","Light","REM","Unclassified"][i]+" "+formatValue(v,"sleep",true):null).filter(Boolean).join(" · ")}</small>}
  </output>;
}
function Chart({points,metric,avg=null,cursor,weekly=true,shape}:Props&{shape:Shape}){
  const [hover,setHover]=useState<number|null>(null);
  const vals=points.flatMap(p=>p.value===null?[]:shape==="range"?[p.low!,p.high!]:[p.value]);
  const hi=Math.max(1,...vals),lo=vals.length?Math.min(...vals):0;
  const tick=metric==="sleep"?3600:hi>=10000?1000:hi>=1000?100:hi>=20?5:1;
  const isRange=shape==="range"||shape==="line"||shape==="dots";
  const min=isRange?Math.max(0,Math.floor((lo-3)/tick)*tick):0;
  const max=Math.max(min+tick,Math.ceil((hi+(isRange?3:0))/tick)*tick);
  const axis=(v:number)=>metric==="sleep"?v/3600+"h":formatValue(v,metric,true);
  const y=(n:number)=>B-(n-min)/(max-min)*(B-T),step=(R-L)/points.length,x=(i:number)=>L+(i+.5)*step;
  const stageColors=["var(--deep)","var(--light)","var(--rem)","var(--unclassified)"];
  const short=(p:ChartPoint)=>weekly?new Date(p.label+"T12:00:00Z").toLocaleDateString("en-US",{weekday:"short",timeZone:"UTC"}):p.label.slice(0,5);
  const line=(a:number,b:number)=>`M${x(a)} ${y(points[a]!.value!)}L${x(b)} ${y(points[b]!.value!)}`;
  const active=hover===null?null:points[hover];
  const selected=cursor===undefined?points.at(-1):points[Math.min(points.length-1,Math.floor(cursor*points.length))];
  return <div className="metric-plot">
    <svg viewBox={`0 0 ${W} 100`} preserveAspectRatio="none" style={{height:weekly?112:96}} role="img" aria-label={names[metric]+", selected "+formatValue(selected?.value??null,metric)+(avg!==null?", average "+formatValue(avg,metric):"")} tabIndex={0} onBlur={()=>setHover(null)}
      onKeyDown={e=>{
        if(!["ArrowRight","ArrowLeft","Home","End"].includes(e.key))return;
        e.preventDefault();e.stopPropagation();
        const current=hover??(weekly?points.length-1:Math.min(points.length-1,Math.floor((cursor??0)*points.length)));
        setHover(e.key==="Home"?0:e.key==="End"?points.length-1:Math.max(0,Math.min(points.length-1,current+(e.key==="ArrowRight"?1:-1))));
      }}
      onPointerLeave={e=>{if(e.pointerType==="mouse")setHover(null);}}
      onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();setHover(Math.max(0,Math.min(points.length-1,Math.floor(((e.clientX-r.left)/r.width*W-L)/step))));}} onPointerDown={e=>{const r=e.currentTarget.getBoundingClientRect();setHover(Math.max(0,Math.min(points.length-1,Math.floor(((e.clientX-r.left)/r.width*W-L)/step))));}}>
      {[min,max].map(v=><text key={v} x={L-6} y={y(v)+3} textAnchor="end">{axis(v)}</text>)}
      {[T,(T+B)/2,B].map(v=><path key={v} className="gridline" d={`M${L} ${v}H${R}`}/>)}
      {points.map((p,i)=>{
        const color=(weekly?i===points.length-1:(i+.5)/points.length<=(cursor??1))?"var(--plot-color)":"var(--plot-light)";
        const fill=color,w=Math.max(1,step*.62),px=x(i),v=p.value;
        return <g key={p.label+i} style={{"--delay":Math.min(i,7)*20+"ms"} as CSSProperties}>
          {v===null?(points.length<30&&<path d={`M${px-3} ${B}h6`} stroke="currentColor"/>):<>
          {(shape==="line"||shape==="dots")&&i>0&&points[i-1]!.value!==null&&<path d={line(i-1,i)} fill="none" stroke={color} strokeWidth="2"/>}
          {shape==="dots"&&<circle cx={px} cy={y(v)} r="4" fill={fill} stroke="var(--chart-surface)" strokeWidth="2"/>}
          {shape==="line"&&(points[i-1]?.value==null&&points[i+1]?.value==null)&&<circle cx={px} cy={y(v)} r="2" fill={color}/>}
          {shape==="bars"&&<path className="growing" d={bar(px,w,y(v),B)} fill={fill}/>}
          {shape==="range"&&<><path d={`M${px} ${y(p.low!)}V${y(p.high!)}`} stroke={color} strokeOpacity=".55" strokeWidth="4" strokeLinecap="round"/><circle cx={px} cy={y(v)} r={i===7?4.5:3.5} fill={color} stroke="var(--chart-surface)" strokeWidth="1.5"/></>}
          {shape==="stack"&&p.parts?.map((n,j)=>{const below=p.parts!.slice(0,j).reduce((a,b)=>a+b,0);return n>0&&<rect key={j} className="growing" x={px-w/2} width={w} y={y(below+n)} height={Math.max(1,y(below)-y(below+n)-2)} rx="2" fill={i===7?stageColors[j]:`color-mix(in srgb, ${stageColors[j]} 90%, var(--chart-surface))`}/>;})}
          {weekly&&i===7&&<text x={px} y={Math.max(9,y(shape==="range"?p.high!:v)-5)} textAnchor="middle">{formatValue(v,metric,true)}</text>}
          </>}
          {(weekly||/^(00|06|12|18):00/.test(p.label))&&<text x={px} y="96" className={weekly&&i===7?"current":""} textAnchor="middle">{short(p)}</text>}
        </g>;
      })}
      {cursor!==undefined&&<path d={`M${L+cursor*(R-L)} ${T}V${B}`} stroke="currentColor"/>}
      {active&&hover!==null&&<path d={`M${x(hover)} ${T}V${B}`} stroke="currentColor" strokeDasharray="2 2"/>}
      {avg!==null&&<AverageLine y={y(avg)} end={x(6)} label={"avg "+formatValue(avg,metric,true)}/>}
    </svg>
    {(active??selected)&&<ChartTooltip point={(active??selected)!} metric={metric} range={shape==="range"} weekly={weekly}/>}
  </div>;
}
function bar(x:number,w:number,top:number,bottom:number){
  const r=Math.min(4,w/2,(bottom-top)/2),l=x-w/2;
  return `M${l} ${bottom}V${top+r}Q${l} ${top} ${l+r} ${top}H${l+w-r}Q${l+w} ${top} ${l+w} ${top+r}V${bottom}Z`;
}
export const SevenDayBars=(p:Props)=><Chart {...p} shape="bars"/>;
export const SevenDayDots=(p:Props)=><Chart {...p} shape="dots"/>;
export const SevenDayRange=(p:Props)=><Chart {...p} shape="range"/>;
export const SevenDayStack=(p:Props)=><Chart {...p} shape="stack"/>;
export const IntradayLine=(p:Props)=><Chart {...p} weekly={false} shape="line"/>;
export const HourlyBars=(p:Props)=><Chart {...p} weekly={false} shape="bars"/>;
