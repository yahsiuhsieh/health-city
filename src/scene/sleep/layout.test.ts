import {expect,it} from "vitest";
import { bankPoint,bankProfile,sleepLayout } from "./layout.ts";
import { SYNTHETIC_SESSION as session } from "./session.ts";
import { returnFrame, ROUTE_LENGTH,routeFrame,S_MOUTH } from "./route.ts";
import { sleepFeatures } from "./water-map.ts";
import { routeSpans } from "./timeline.ts";

it("keeps the corridors clear and seats each stage on its own terrain",()=>{
  const layout=sleepLayout(session);
  expect(layout).toEqual(sleepLayout(session));
  expect(layout.channels).toHaveLength(4);
  const inbound=Array.from({length:500},(_,i)=>returnFrame(i/499));
  const outbound=Array.from({length:500},(_,i)=>routeFrame(i/499*ROUTE_LENGTH));
  for(const channel of layout.channels)for(const section of channel.sections)for(const [u,h] of bankProfile){
    const p=bankPoint(section,u,h);
    expect(Math.min(...inbound.map(q=>Math.hypot(p.x-q.x,p.z-q.z)))).toBeGreaterThan(6);
  }
  for(const p of layout.props){
    expect(p.routeS).toBeGreaterThanOrEqual(S_MOUTH);
    expect(Math.min(...outbound.map(q=>Math.hypot(p.x-q.x,p.z-q.z)))).toBeGreaterThan(4);
    expect(Math.min(...inbound.map(q=>Math.hypot(p.x-q.x,p.z-q.z)))).toBeGreaterThan(6);
    if(p.variant.startsWith("tree-"))expect(p.y).toBeGreaterThan(.5);
    if(p.top!==undefined){expect(p.top).toBeLessThan(-.15);expect(p.top).toBeGreaterThan(-.6);}
  }
  for(const span of routeSpans(session).filter(s=>s.stage==="REM")){
    const corals=layout.props.filter(p=>p.top!==undefined && p.routeS>=span.s0 && p.routeS<=span.s1);
    expect(new Set(corals.map(p=>p.variant.split("-").slice(0,-1).join("-"))).size).toBeGreaterThanOrEqual(6);
  }
  expect(sleepFeatures(session).some(f=>f.kind==="sandbar" && f.top>0)).toBe(true);
});
