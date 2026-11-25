import { expect,it } from "vitest";
import { captainAt,captainTrack,stations,walkRate } from "./captain.ts";
import { SYNTHETIC_SESSION as session } from "./session.ts";
import { lightEvents,companionFor,companionState,companions,dolphinAt,fishAt } from "./wildlife.ts";

it("reconstructs the LIGHT events with the synthetic event counts",()=>{
  const schedule=lightEvents(session);
  expect(lightEvents({...session})).toEqual(schedule);
  for(const kind of ["glide","dive"] as const){
    const count=schedule.filter(e=>e.kind===kind).length;
    expect(count).toBeGreaterThanOrEqual(20);expect(count).toBeLessThanOrEqual(40);
  }
  for(const event of schedule.filter(e=>e.kind==="glide")){
    expect(event.count).toBeGreaterThanOrEqual(4);expect(event.count).toBeLessThanOrEqual(10);
    const begin=fishAt(event,0,0),end=fishAt(event,0,event.duration);
    const length=Math.hypot(end.along-begin.along,end.across-begin.across);
    expect(length).toBeGreaterThanOrEqual(20);expect(length).toBeLessThanOrEqual(45);
    expect(fishAt(event,0,event.duration/2).height).toBeCloseTo(.04);
  }
});
it("restores all four encounters and keeps the animals near the surface",()=>{
  expect(companions.map((_,i)=>companionFor(session,i))).toEqual(companions);
  for(const species of companions){
    let shallow=0,samples=0,breaches=0,previous=false;
    for(let t=8700;t<11100;t+=4){
      const state=companionState(session,t,species)!;
      const h=species==="dolphin"?dolphinAt(2,state.a,state.side).height:state.height;
      if(h>=-1&&h<=-.2)shallow++;samples++;
      if(state.breach>0&&!previous)breaches++;
      previous=state.breach>0;
    }
    expect(shallow/samples).toBeGreaterThanOrEqual(.7);
    expect(breaches).toBe(species==="whale"?1:0);
    expect(companionState(session,9423,species)).toEqual(companionState({...session},9423,species));
  }
  expect(companionState(session,14800)).toBeNull();
});
it("keeps every pod member and the whale's back shallow through both REM encounters",()=>{
  for(const span of session.segments.filter(s=>s.stage==="REM")){
    const pod=companionState(session,span.start,"dolphin")!.pod;
    expect(pod).toBeGreaterThanOrEqual(6);expect(pod).toBeLessThanOrEqual(10);
    const shallow=Array<number>(pod+1).fill(0);
    let samples=0;
    for(let t=span.start;t<span.end;t+=2){
      const whale=companionState(session,t,"whale")!;
      const heights=Array.from({length:pod},(_,i)=>dolphinAt(i,whale.a,whale.side).height);
      heights.push(whale.height+.9*whale.surface);
      heights.forEach((h,i)=>{if(h>=-1.2 && h<=-.2)shallow[i]!++;});
      samples++;
    }
    expect(Math.min(...shallow)/samples).toBeGreaterThanOrEqual(.7);
  }
});

it("walks on connected deck edges at 1.2 metres per ambient unit and boards before cast-off",()=>{
  const track=captainTrack(session);
  for(const [i,leg] of track.entries()){
    const mid=(leg.start+leg.end)/2,state=captainAt(session,mid);
    const p=stations[leg.from]!,q=stations[leg.to]!;
    for(let k=0;k<3;k++)expect(state.position[k]).toBeCloseTo(p[k]!+(q[k]!-p[k]!)*(leg.u+leg.v)/2);
    if(leg.action==="walk"){
      const distance=Math.hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2])*Math.abs(leg.u-leg.v);
      expect(distance/(leg.end-leg.start)).toBeCloseTo(walkRate,7);
    }
    if(i)expect(captainAt(session,leg.start-.00001).position.every((x,k)=>Math.abs(x-captainAt(session,leg.start).position[k]!)<.0001)).toBe(true);
  }
  expect(captainAt(session,27599).ashore).toBe(0);
  expect(captainAt(session,27334).station).toBe("jetty-wait");
  expect(captainAt(session,14780).station).toBe("bow-windlass");
  expect(captainAt(session,6500).action).toBe("seat");
});

it("reverses an interrupted walk without jumping to a station",()=>{
  const brief={...session,segments:[
    {stage:"ASLEEP",start:0,end:200},{stage:"AWAKE",start:200,end:235},{stage:"DEEP",start:235,end:1500},
  ]} satisfies typeof session;
  const turning=200+35*.66;
  const p=captainAt(brief,turning),before=captainAt(brief,turning-1),after=captainAt(brief,turning+1);
  expect(p.station).toBeNull();expect(p.action).toBe("walk");
  for(let k=0;k<3;k++)expect(before.position[k]).toBeCloseTo(after.position[k]!,7);
  expect(captainAt(brief,1100).station).toBe("helm-seat");
});
