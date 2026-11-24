import type { SleepSession,SleepStage } from "./session.ts";
import { seededRandom } from "./random.ts";
import { ambientTime } from "../ocean/ambient-time.ts";
import { routeSpans } from "./timeline.ts";

const smooth=(v:number)=>{const u=Math.max(0,Math.min(1,v));return u*u*(3-2*u);};
function cabin(stage?:SleepStage){
  return {closed:Number(stage==="DEEP"),bright:Number(stage==="AWAKE"),captain:stage==="DEEP"?"inside":stage==="AWAKE"?"bow":"wing"};
}
export function cabinState(session:SleepSession,t:number){
  const spans=routeSpans(session),span=t>=0?spans.find(s=>t<s.end):undefined;
  const from=cabin(span?spans[span.index-1]?.stage:t>=0?spans.at(-1)?.stage:undefined),to=cabin(span?.stage);
  const u=smooth((t-(span?.start??spans.at(-1)?.end??0))/90);
  const closed=from.closed+(to.closed-from.closed)*u,bright=from.bright+(to.bright-from.bright)*u;
  const held=span?.stage==="AWAKE"?t-span.start:0;
  const anchor=span?.stage==="AWAKE" && span.end-span.start>=240?Math.min(1,held/60,(span.end-t)/60):0;
  return {closed,bright,captain:u<.5?from.captain:to.captain,anchor,
    swing:Math.PI/30*Math.sin(held*Math.PI/60)*smooth(held/15)*smooth(((span?.end??t)-t)/15),
    entry:anchor>0?smooth((held-22)/3)*(1-smooth((held-28)/14)):0,
    lamps:1-.85*closed+.6*bright,day:1.4*bright,night:.65-.47*closed+.75*bright};
}
const species=["ray","whale","shark"] as const;
export function companionFor(session:SleepSession,index:number){
  const seed=seededRandom(session.id,"rem-companion")();
  const start=session.id==="synthetic-sleep-2026-11-11"?0:Math.floor(seed*3);
  return species[(start+index)%3]!;
}
export function companionState(session:SleepSession,t:number,seconds:number){
  const rem=routeSpans(session).filter(s=>s.stage==="REM"),index=rem.findIndex(s=>s.start<=t&&t<s.end);
  if(index<0)return null;
  const span=rem[index]!,kind=companionFor(session,index),a=ambientTime(seconds);
  const fade=smooth((t-span.start)/60)*smooth((span.end-t)/60);
  const cycle=(a%12+12)%12,surface=cycle<3?Math.sin(Math.PI*cycle/3):0;
  const side=seededRandom(session.id,"companion-side-"+index)()<.5?-1:1;
  return {kind,fade,a,cycle,surface,side:kind==="whale"?-1:side,
    across:kind==="whale"?26+2*Math.sin(a*.25):kind==="ray"?3.8:13+2*Math.sin(a*.54),
    height:kind==="whale"?-2.3+2.45*surface:kind==="ray"?-.46+.045*Math.sin(a*2):-.93,
    wing:Math.PI*.1*Math.sin(a*Math.PI/1.2),tail:.21*Math.sin(a*2.3)};
}
