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
      if(s<ROUTE_LENGTH-12)expect(islandRevealAt(session,t)).toBe(0);
      previous=reveal;
    }
    expect(islandRevealAt(session,27000)).toBe(1);
    const a=voyageState(session,18000);
    voyageState(session,700);
    expect(voyageState(session,18000)).toEqual(a);
  });
  it("shortens both return durations and can start with an awakening",()=>{
    expect(returnDurations(1200)).toEqual({wait:300,sail:900});
    const late={...session,segments:[{stage:"AWAKE" as const,start:0,end:300},{stage:"ASLEEP" as const,start:300,end:900}]};
    expect(voyageState(late,299).s).toBe(0);
    expect(routeDistanceAt(late,450)).toBe(S_MOUTH);
  });
  it("separates the offshore transit legs between their shared approaches",()=>{
    const main=Array.from({length:300},(_,i)=>routeFrame(ROUTE_LENGTH*i/299));
    for(let i=0;i<=200;i++){
      const p=returnFrame(i/200);
      if(p.x>=55 && p.x<=163)expect(Math.min(...main.map(q=>Math.hypot(q.x-p.x,q.z-p.z)))).toBeGreaterThanOrEqual(20);
    }
  });
});

it("keeps the offshore turning radius above 25 metres",()=>{
  for(let s=S_MOUTH+.1;s<ROUTE_LENGTH-.1;s+=.1){
    const turn=routeFrame(s+.1).yaw-routeFrame(s-.1).yaw;
    expect(.2/Math.abs(turn)).toBeGreaterThanOrEqual(25);
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
  expect(wakeStrength(session,30000)).toBe(0);
});
