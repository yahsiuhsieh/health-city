import {expect,it} from "vitest";
import { islandShape,islandTerrain,polygonArea,habitats,stageMinutes } from "./island-shape.ts";
import { SYNTHETIC_SESSION as session } from "./session.ts";
import { cabinState,companionFor } from "./vessel-state.ts";
it("preserves area, the pier connection and habitat fractions across nap and night sizes",()=>{
  for(const minutes of [20,60,180,442,720]){
    const land=islandTerrain(session,minutes);
    expect(polygonArea(land.polygon)).toBeCloseTo(2.4*minutes,6);
    expect(land.polygon[0]).toEqual(land.shore);
    expect(Math.hypot(land.pier[0]-land.shore[0],land.pier[1]-land.shore[1])).toBeCloseTo(6);
    const totals=stageMinutes(session);
    for(const habitat of habitats)expect(Math.abs(land.cells.filter(p=>p.habitat===habitat).length/land.cells.length-totals[habitat]/442)).toBeLessThan(.01);
    const median=(h:string)=>{const a=land.cells.filter(p=>p.habitat===h).map(p=>p.y).sort((x,y)=>x-y);return a[Math.floor(a.length/2)]!;};
    expect(median("DEEP")).toBeGreaterThan(median("LIGHT"));
  }
});
it("keeps each seed star-shaped and repeatable",()=>{
  const original=islandShape(session);
  expect(original.polygon).toEqual(islandShape(session).polygon);
  for(let i=0;i<50;i++){
    const l=islandShape({...session,id:"seed-"+i});
    expect(l.polygon).not.toEqual(original.polygon);
    for(const [j,p] of l.polygon.entries()){const q=l.polygon[(j+1)%256]!;
      expect((p[0]-l.center[0])*(q[1]-l.center[1])-(p[1]-l.center[1])*(q[0]-l.center[0])).toBeGreaterThan(0);}
  }
});
it("restores the cabin, anchor and companions from session time",()=>{
  expect(companionFor(session,0)).toBe("ray");expect(companionFor(session,1)).toBe("whale");
  expect(cabinState(session,3700).captain).toBe("inside");
  expect(cabinState(session,14400+240)).toMatchObject({anchor:1,bright:1,captain:"bow"});
  expect(cabinState(session,14400+480).anchor).toBe(0);
});

it("keeps the destination and the stage coast clear of the fairway",async()=>{
  const {coastDistance}=await import("./island-shape.ts"),{ROUTE_LENGTH,routeFrame}=await import("./route.ts");
  const {sleepLayout}=await import("./layout.ts");
  const land=islandShape(session);
  for(let s=0;s<=ROUTE_LENGTH-20;s+=.25){
    const p=routeFrame(s);expect(coastDistance(p.x,p.z,land.polygon)).toBeGreaterThanOrEqual(25);
  }
  for(const p of sleepLayout(session).props)expect(coastDistance(p.x,p.z,land.polygon)).toBeGreaterThanOrEqual(8);
});

it("stores the deep channel mask only inside the route band",async()=>{
  const {routeSpans}=await import("./timeline.ts"),{routeFrame}=await import("./route.ts"),{waterMap}=await import("./water-map.ts");
  const {texture,bounds}=waterMap(session),image=texture.image;
  const sample=(x:number,z:number)=>{const i=Math.floor((x-bounds.x)*2),j=Math.floor((z-bounds.y)*2);return 4*(i+j*image.width);};
  const deep=routeSpans(session).find(s=>s.stage==="DEEP")!,f=routeFrame((deep.s0+deep.s1)/2);
  expect(image.data![sample(f.x,f.z)+1]!).toBeGreaterThan(229);
  expect(Array.from(image.data!.slice(sample(f.x,48),sample(f.x,48)+3))).toEqual([0,0,0]);texture.dispose();
});
