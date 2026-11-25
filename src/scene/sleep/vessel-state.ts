import type { SleepSession,SleepStage } from "./session.ts";
import { routeSpans } from "./timeline.ts";

const smooth=(v:number)=>{const u=Math.max(0,Math.min(1,v));return u*u*(3-2*u);};
function cabin(stage?:SleepStage){
  return {closed:Number(stage==="DEEP"),bright:Number(stage==="AWAKE")};
}
export function cabinState(session:SleepSession|undefined,t:number){
  const spans=session?routeSpans(session):[],span=t>=0?spans.find(s=>t<s.end):undefined;
  const from=cabin(span?spans[span.index-1]?.stage:t>=0?spans.at(-1)?.stage:undefined),to=cabin(span?.stage);
  const u=smooth((t-(span?.start??spans.at(-1)?.end??0))/90);
  const closed=from.closed+(to.closed-from.closed)*u,bright=from.bright+(to.bright-from.bright)*u;
  const held=span?.stage==="AWAKE"?t-span.start:0;
  const anchor=span?.stage==="AWAKE" && span.end-span.start>=240?Math.min(1,held/60,(span.end-t)/60):0;
  return {closed,bright,anchor,
    entry:anchor>0?smooth((held-22)/3)*(1-smooth((held-28)/14)):0,
    lamps:1-closed+.6*bright,day:.32*closed+1.4*bright,night:.65-.47*closed+.75*bright};
}
