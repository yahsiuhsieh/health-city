import { deckSockets } from "./deck-sockets.ts";
import { seededRandom } from "./random.ts";
import { elapsedSeconds, type SleepSession } from "./session.ts";
import { routeSpans } from "./timeline.ts";
import { companionState, type Companion } from "./wildlife.ts";
import { WORK_BOAT_BERTH, workingQuay } from "../city/harbor-plan.ts";

type Point=[number,number,number];
const quayZ=workingQuay.edge-1.24-WORK_BOAT_BERTH.position[1];
export const stations:Record<string,Point>={...deckSockets,
  "quay-stern":[-10,workingQuay.top,quayZ],"quay-bow":[10,workingQuay.top,quayZ],
  "quay-gate":[.54,workingQuay.top,quayZ],"jetty-gate":[.54,1.4,-3.82],"jetty-wait":[.54,1.4,-4.12],
  "ladder-lip":[-5.96,3.76,0],"helm-seat":[-3.02,1.3,0],"hatch-clear":[5.25,1.3,1.65]};
const edges:string[][]=[
  ["quay-stern","quay-gate","quay-bow"],["quay-gate","boarding-port","jetty-gate","jetty-wait"],
  ["boarding-port","side-port-fwd"],["helm","helm-seat"],["ladder-base","ladder-lip","ladder-top"],["aft-deck","ladder-base"],
  ["side-starboard-fwd","hatch-clear","foredeck","bow-windlass"],
];
for(const [side,sign] of [["port",-1],["starboard",1]] as const){
  stations["doorstep-"+side]=[-3.72,1.3,2.22*sign];
  stations["aisle-"+side]=[-2.74,1.3,.7*sign];
  stations["stern-turn-"+side]=[-6.03,1.3,2.08*sign];
  stations["roof-turn-"+side]=[-5.32,3.76,1.52*sign];
  stations["roof-wing-"+side]=[-4.40,3.76,1.57*sign];
  edges.push(["helm","aisle-"+side,"wh-door-"+side,"doorstep-"+side,"side-"+side+"-fwd"],
    ["doorstep-"+side,"side-"+side+"-aft","stern-turn-"+side,"ladder-base"],
    ["ladder-top","roof-turn-"+side,"roof-wing-"+side,"wing-"+side]);
}
const neighbors=new Map<string,string[]>();
for(const path of edges)for(let i=1;i<path.length;i++){
  const a=path[i-1]!,b=path[i]!;
  for(const [from,to] of [[a,b],[b,a]] as const){
    if(!neighbors.has(from))neighbors.set(from,[]);
    neighbors.get(from)!.push(to);
  }
}
function length(a:string,b:string){
  const p=stations[a]!,q=stations[b]!;
  return Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);
}
function shortest(from:string,to:string){
  const pending=[{node:from,path:[from],distance:0}],seen=new Set<string>();
  while(pending.length){
    pending.sort((a,b)=>b.distance-a.distance);
    const step=pending.pop()!;
    if(step.node===to)return step;
    if(seen.has(step.node))continue;
    seen.add(step.node);
    for(const next of neighbors.get(step.node)!)if(!seen.has(next))
      pending.push({node:next,path:[...step.path,next],distance:step.distance+length(step.node,next)});
  }
  throw new Error("No walkway connects "+from+" to "+to+".");
}
type Action="wheel"|"seat"|"watch"|"point"|"anchor"|"look"|"line"|"wait"|"walk";
interface Leg {from:string;to:string;u:number;v:number;start:number;end:number;action:Action;distance:number}
export const walkRate=1.2/190;
export function captainTrack(session:SleepSession,override?:Companion){
  const legs:Leg[]=[];
  let from="quay-stern",to=from,u=0,clock=-11000,distance=0;
  function add(v:number,end:number,action:Action){
    if(end<=clock)return;
    legs.push({from,to,u,v,start:clock,end,action,distance});
    distance+=Math.abs(v-u)*length(from,to);clock=end;u=v;
  }
  function move(goal:string,until:number){
    if(clock>=until)return;
    const endFrom=shortest(from,goal),endTo=shortest(to,goal),l=length(from,to);
    const reverse=l*u+endFrom.distance<l*(1-u)+endTo.distance;
    const path=reverse?endFrom.path:endTo.path;
    function advance(v:number){
      const d=Math.abs(v-u)*length(from,to);
      if(d<1e-8){u=v;return;}
      const end=Math.min(until,clock+d/walkRate);
      add(u+(v-u)*Math.min(1,(end-clock)*walkRate/d),end,"walk");
    }
    advance(reverse?0:1);
    for(let i=1;i<path.length&&clock<until;i++){
      from=path[i-1]!;to=path[i]!;u=0;advance(1);
    }
  }
  function hold(end:number,action:Action){add(u,end,action);}
  function visit(goal:string,end:number,action:Action){move(goal,end);hold(end,action);}
  hold(-10600,"line");move("quay-bow",-1500);hold(clock+95,"line");
  move("boarding-port",0);move("aft-deck",0);move("helm",0);hold(0,"wheel");
  const total=elapsedSeconds(session);
  for(const s of routeSpans(session)){
    const end=s.end;
    if(s.stage==="LIGHT"){
      const random=seededRandom(session.id,"round-"+s.index);
      if(end===total){
        move("helm",Math.min(end,s.start+500));
        visit("boarding-port",end,"wait");
        continue;
      }
      visit("helm",Math.min(end,clock+190*(6+3*random())),"wheel");
      let round=0;
      while(clock<end){
        const target=(s.index+round++)%2===0?"wing-starboard":"foredeck";
        move(target,end);hold(Math.min(end,clock+190*(2+random())),"watch");
        move("helm",end);hold(Math.min(end,clock+190*(6+3*random())),"wheel");
      }
    }else if(s.stage==="REM"){
      const c=companionState(session,(s.start+s.end)/2,override)!;
      visit("doorstep-"+(c.side<0?"port":"starboard"),end,"point");
    }else if(s.stage==="AWAKE"){
      if(end-s.start>=240)visit("bow-windlass",end,"anchor");
      else {visit("wh-door-port",s.start+(end-s.start)*.66,"look");visit("helm",end,"wheel");}
    }else visit(s.stage==="DEEP"?"helm-seat":"helm",end,s.stage==="DEEP"?"seat":"wheel");
  }
  visit("boarding-port",total+46,"line");hold(total+78,"line");
  move("jetty-wait",total+338);hold(total+338,"wait");
  move("boarding-port",total+600);move("helm",total+4200);hold(total+4200,"wheel");
  return legs;
}
const tracks=new WeakMap<SleepSession,Map<string,Leg[]>>();
export function captainAt(session:SleepSession,t:number,override?:Companion){
  let variants=tracks.get(session);
  if(!variants){variants=new Map();tracks.set(session,variants);}
  const key=override??"session";
  if(!variants.has(key))variants.set(key,captainTrack(session,override));
  const track=variants.get(key)!;
  const leg=track.find(l=>t<l.end)??track[track.length-1]!;
  const progress=Math.max(0,Math.min(1,(t-leg.start)/(leg.end-leg.start))),u=leg.u+(leg.v-leg.u)*progress;
  const p=stations[leg.from]!,q=stations[leg.to]!,dir=leg.v<leg.u?-1:1;
  const position=p.map((x,i)=>x+(q[i]!-x)*u) as Point;
  const station=u<.0001?leg.from:u>.9999?leg.to:null,action=leg.action;
  const yaw=action==="walk"?Math.atan2(dir*(q[0]-p[0]),dir*(q[2]-p[2])):
    action==="point"||action==="watch"?(position[2]<0?Math.PI:0):action==="line"?(station?.startsWith("quay-")?0:Math.PI):Math.PI/2;
  const shore=(s:string)=>Number(s.startsWith("jetty-")||s.startsWith("quay-"));
  return {position,station,from:leg.from,to:leg.to,u,yaw,action,ashore:shore(leg.from)*(1-u)+shore(leg.to)*u,
    distance:leg.distance+Math.abs(u-leg.u)*length(leg.from,leg.to)};
}
