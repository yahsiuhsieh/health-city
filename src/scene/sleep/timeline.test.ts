import {describe,expect,it} from "vitest";
import { SYNTHETIC_SESSION as session, asleepSeconds, elapsedSeconds } from "./session.ts";
import { ROUTE_LENGTH, S_MOUTH, routeFrame, returnFrame } from "./route.ts";
import { islandRevealAt, routeDistanceAt, revealDistanceAt, routeSpans, returnDurations, voyageState } from "./timeline.ts";

describe("sleep route",()=>{
  it("maps the asleep clock to metres after the harbor exit",()=>{
    expect(asleepSeconds(session)).toBe(442*60);
    expect(elapsedSeconds(session)).toBe(450*60);
    expect(routeDistanceAt(session,600)).toBe(S_MOUTH);
    const rate=(ROUTE_LENGTH-S_MOUTH)/(442*60-600);
    for(const span of routeSpans(session)){
      const delta=span.s1-Math.max(span.s0,S_MOUTH);
      expect(delta).toBeCloseTo(span.stage==="AWAKE"?0:rate*(span.end-Math.max(span.start,600)),8);
    }
  });
  it("restores the reveal on every seek",()=>{
    let previous=-1;
    for(let i=0;i<1001;i++){
      const t=i*28-1, s=routeDistanceAt(session,t);
      const reveal=revealDistanceAt(session,t);
      expect(reveal).toBeGreaterThanOrEqual(previous);
      if(s<ROUTE_LENGTH-60)expect(islandRevealAt(session,t)).toBe(0);
      previous=reveal;
    }
    expect(islandRevealAt(session,27000)).toBe(1);
    const a=voyageState(session,18000);
    voyageState(session,700);
    expect(voyageState(session,18000)).toEqual(a);
  });
  it("shortens both return durations and can start with an awakening",()=>{
    expect(returnDurations(2100)).toEqual({wait:300,sail:1800});
    const late={...session,segments:[{stage:"AWAKE" as const,start:0,end:300},{stage:"ASLEEP" as const,start:300,end:900}]};
    expect(voyageState(late,299).s).toBe(0);
    expect(routeDistanceAt(late,450)).toBe(S_MOUTH);
  });
  it("keeps the swept hull clear through departure, return and both turns",async()=>{
    const {harborClearance}=await import("./clearance.ts");
    let minimum=Infinity;
    for(let s=0;s<=ROUTE_LENGTH;s+=.25){
      const p=routeFrame(s);
      minimum=Math.min(minimum,harborClearance(p,p.maneuver==="lateral").minimum);
    }
    let last=returnFrame(0);
    for(let i=0;i<=14400;i++){
      const p=returnFrame(i/14400);
      const distance=Math.hypot(p.x-last.x,p.z-last.z);
      const angle=Math.abs(Math.atan2(Math.sin(p.yaw-last.yaw),Math.cos(p.yaw-last.yaw)));
      expect(distance).toBeLessThanOrEqual(.5);
      expect(angle*180/Math.PI).toBeLessThanOrEqual(2);
      if(p.maneuver==="path" && last.maneuver==="path" && distance>.001 && angle>.000001)
        expect(distance/angle).toBeGreaterThanOrEqual(p.x>171 ? 60 : 30);
      last=p;
      minimum=Math.min(minimum,harborClearance(p,p.maneuver==="lateral").minimum);
    }
    expect(minimum).toBeGreaterThanOrEqual(0);
  });
  it("points the bow along travel and limits pivot rate throughout replay",()=>{
    let last=voyageState(session,-5);
    for(let t=0;t<=31200;t+=5){
      const p=voyageState(session,t),dx=p.x-last.x,dz=p.z-last.z,d=Math.hypot(dx,dz);
      const angle=Math.atan2(Math.sin(p.yaw-last.yaw),Math.cos(p.yaw-last.yaw));
      if(p.maneuver==="pivot")expect(Math.abs(angle)*180/Math.PI*190/5).toBeLessThanOrEqual(150);
      if(d>1e-6 && p.maneuver==="path" && last.maneuver==="path")
        expect((dx*Math.cos(p.yaw)-dz*Math.sin(p.yaw))/d).toBeGreaterThanOrEqual(Math.cos(Math.PI/9));
      last=p;
    }
  });
});

it("keeps offshore bends above the 60 m minimum radius",()=>{
  for(let s=S_MOUTH+.1;s<ROUTE_LENGTH-.1;s+=.1){
    const turn=routeFrame(s+.1).yaw-routeFrame(s-.1).yaw;
    expect(.2/Math.abs(turn)).toBeGreaterThanOrEqual(60);
  }
});

it("samples the stern track at metre intervals and fades after each stop",async()=>{
  const {wakePath,wakeStrength}=await import("./timeline.ts");
  const path=wakePath(session,15000);
  expect(path).toHaveLength(55);
  for(let i=1;i<path.length;i++){
    expect(path[i]!.behind).toBe(i);
    expect(Math.hypot(path[i]!.x-path[i-1]!.x,path[i]!.z-path[i-1]!.z)).toBeCloseTo(1,2);
  }
  expect(wakeStrength(session,-5)).toBe(0);
  expect(wakeStrength(session,30)).toBe(.5);
  expect(wakeStrength(session,60)).toBe(1);
  expect(wakeStrength(session,27600)).toBe(0);
  expect(wakeStrength(session,31800)).toBe(0);
});

it("clears both reefs, enters the south jetty westbound, and returns on a separate lane",async()=>{
  const {HARBOR_MOUTH}=await import("../city/harbor-plan.ts");
  const {outerReef}=await import("./outer-reef.ts");
  const {islandShape}=await import("./island-shape.ts");
  const head=routeFrame(ROUTE_LENGTH-1), [mx,mz]=HARBOR_MOUTH.point;
  const direct=Math.hypot(head.x-mx,head.z-mz);
  expect(direct).toBeGreaterThanOrEqual(450);expect(direct).toBeLessThanOrEqual(500);
  expect(Math.abs(ROUTE_LENGTH-900)).toBeLessThanOrEqual(25);
  expect(ROUTE_LENGTH/direct).toBeLessThanOrEqual(2);
  const obstacleOnDirect=Array.from({length:501},(_,i)=>outerReef.distance(mx+(head.x-mx)*i/500,mz+(head.z-mz)*i/500));
  expect(Math.min(...obstacleOnDirect)).toBeLessThan(0);
  for(let s=0;s<=120;s+=.5){
    const p=routeFrame(ROUTE_LENGTH-1-s);
    expect(p.x).toBeCloseTo(head.x+s,5);
    expect(p.z).toBeCloseTo(head.z,5);
  }
  const seaward=Array.from({length:Math.ceil(ROUTE_LENGTH-S_MOUTH)},(_,i)=>routeFrame(S_MOUTH+i));
  const returning=Array.from({length:3001},(_,i)=>returnFrame(i/5000)).filter(p=>p.x>mx);
  const islands=[5,20,60,180,442,720].map(m=>islandShape(session,m));
  for(const [i,p] of seaward.entries()){
    expect(outerReef.distance(p.x,p.z)).toBeGreaterThanOrEqual(40);
    if(S_MOUTH+i<ROUTE_LENGTH-121)for(const island of islands)
      expect(island.reef.distance(p.x,p.z)).toBeGreaterThanOrEqual(40);
  }
  function side(a:typeof head,b:typeof head,c:typeof head){return (b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);}
  for(const [i,p] of returning.entries()){
    expect(outerReef.distance(p.x,p.z)).toBeGreaterThanOrEqual(40);
    if(!i)continue;
    const q=returning[i-1]!;
    for(let k=1;k<seaward.length;k++){
      const a=seaward[k-1]!,b=seaward[k]!;
      if(side(a,b,p)*side(a,b,q)<0 && side(p,q,a)*side(p,q,b)<0)throw Error("The offshore lanes intersect.");
    }
  }
});

it("keeps the fenders and safety margin clear of the wake buoy at anchor and during return",async()=>{
  const {pointClearance}=await import("./clearance.ts");
  const wake=routeSpans(session).find(s=>s.stage==="AWAKE")!,marker=routeFrame(wake.s0);
  const x=marker.x+6*marker.nx,z=marker.z+6*marker.nz;
  let minimum=Infinity;
  for(let t=wake.start;t<=wake.end;t++){
    const p=voyageState(session,t);
    minimum=Math.min(minimum,pointClearance(p,x,z,.51));
  }
  for(let s=wake.s0;s<=ROUTE_LENGTH;s+=.5) minimum=Math.min(minimum,pointClearance(routeFrame(s),x,z,.51));
  for(let i=0;i<=14400;i++) minimum=Math.min(minimum,pointClearance(returnFrame(i/14400),x,z,.51));
  expect(minimum).toBeGreaterThan(0);
});

it("stops forward motion before the one-metre slide and casts off before advancing",()=>{
  const end=elapsedSeconds(session),head=routeFrame(ROUTE_LENGTH-1);
  const moored=voyageState(session,end),afterWait=voyageState(session,end+600);
  expect(moored.maneuver).toBe("hold");
  expect(moored.x).toBeCloseTo(head.x);expect(moored.z).toBeCloseTo(head.z-1);
  const arrival=voyageState(session,end-57),departure=voyageState(session,end+636);
  for(const p of [arrival,afterWait,departure]){
    expect(p.maneuver).toBe("lateral");expect(p.x).toBeCloseTo(head.x);expect(Math.cos(p.yaw)).toBe(-1);
  }
  expect(arrival.z).toBeCloseTo(head.z-.5);expect(departure.z).toBeCloseTo(arrival.z);
  expect(returnFrame(.02).z).toBeCloseTo(head.z);
  const turn=Array.from({length:180},(_,i)=>returnFrame(i/1000)).find(p=>p.maneuver==="path" && Math.abs(Math.sin(p.yaw))>.001)!;
  expect(head.x-turn.x).toBeGreaterThan(20);
});

it("keeps distinct shallow reef crests on a shared shelf with channels of different depths",async()=>{
  const {outerReef}=await import("./outer-reef.ts");
  const {outerReefSeabed}=await import("./reef.ts");
  const bed=outerReefSeabed();
  try{
    expect(outerReef.patches).toHaveLength(5);
    const channelDepths:number[]=[];
    for(const patch of outerReef.patches){
      const depth=bed.depthAt(...patch.center);
      expect(depth).toBeGreaterThan(0);
      expect(depth).toBeLessThan(3);
      let gap=Infinity,channelDepth=0;
      for(const neighbor of outerReef.patches){
        if(neighbor===patch)continue;
        for(const a of patch.polygon)for(const b of neighbor.polygon){
          const distance=Math.hypot(a[0]-b[0],a[1]-b[1]);
          if(distance>=gap)continue;
          gap=distance;
          channelDepth=bed.depthAt((a[0]+b[0])/2,(a[1]+b[1])/2);
        }
      }
      expect(gap).toBeGreaterThan(10);
      expect(channelDepth).toBeGreaterThan(depth);
      channelDepths.push(channelDepth);
    }
    expect(Math.min(...channelDepths)).toBeLessThan(5);
    expect(Math.max(...channelDepths)).toBeGreaterThan(8);
  }finally{bed.texture.dispose();}
});

it("places the elongated outer reef east of the harbor mouth",async()=>{
  const {outerReef}=await import("./outer-reef.ts");
  const {HARBOR_MOUTH}=await import("../city/harbor-plan.ts");
  const east=outerReef.center[0]-HARBOR_MOUTH.point[0];
  expect(east).toBeGreaterThanOrEqual(200);expect(east).toBeLessThanOrEqual(280);
  let length=0,tx=0,tz=0;
  for(const a of outerReef.vertices)for(const b of outerReef.vertices){
    const dx=b[0]-a[0],dz=b[1]-a[1],distance=Math.hypot(dx,dz);
    if(distance>length){length=distance;tx=dx/distance;tz=dz/distance;}
  }
  expect(length).toBeGreaterThanOrEqual(220);expect(length).toBeLessThanOrEqual(320);
  expect(Math.abs(tz)).toBeGreaterThan(Math.abs(tx));
  const across=outerReef.vertices.map(([x,z])=>-tz*x+tx*z);
  const width=Math.max(...across)-Math.min(...across);
  expect(width).toBeGreaterThanOrEqual(50);expect(width).toBeLessThanOrEqual(90);
});

it("holds the heading at anchor, at the jetty, and at the berth",()=>{
  const end=elapsedSeconds(session);
  for(const [start,stop] of [[-600,-1],[14400,14879],[end,end+599],[end+4200,end+4800]] as const){
    const heading=voyageState(session,start).yaw;
    for(let t=start;t<=stop;t+=5){
      const pose=voyageState(session,t);
      expect(pose.maneuver).toBe("hold");
      expect(Math.abs(pose.yaw-heading)).toBeLessThan(Math.PI/360);
    }
  }
});
