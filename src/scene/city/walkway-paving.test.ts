import {expect,it} from "vitest";
import {CITY_PLAN} from "./city-plan.data.ts";
import {assembleInterim} from "./interim-buildings.ts";
import {footwayClipper} from "./pavement.ts";
import {area,roadSurfaces,sidewalks,type Point} from "./street-graph.ts";
import {openSpaceEntries} from "./tower-gardens.ts";
import {gardenPavement,pavementLayer} from "./walkway-paving.ts";
import {ribbon} from "./walkway-shape.ts";

function surfaceArea(patches:Point[][]){
  return patches.reduce((sum,patch)=>sum+Math.abs(area(patch)),0);
}

it("joins both arms of a T with a single layer of paving",()=>{
  const layer=pavementLayer([]);
  layer.pave(ribbon([[-5,0],[5,0]],1));
  layer.pave(ribbon([[0,4],[0,0]],.7));
  expect(surfaceArea(layer.patches)).toBeCloseTo(20+3*1.4,8);
});

it.each([0,20,30,null])("keeps walkways clear of other surfaces with %s occupied plots",count=>{
  const sides=sidewalks(CITY_PLAN);
  const streets=[...roadSurfaces(CITY_PLAN),...sides];
  const entries=openSpaceEntries(count);
  const terraces=entries.filter(entry=>entry.outline.length).map(entry=>({polygon:entry.outline}));
  const {patches}=gardenPavement(count,streets);
  const remaining=footwayClipper([...streets,...terraces]);
  for(const patch of patches){
    expect(surfaceArea(remaining(patch))).toBeCloseTo(Math.abs(area(patch)),6);
    remaining.reserve(patch);
  }
  const uncovered=footwayClipper([...sides,...terraces,...patches.map(polygon=>({polygon}))]);
  for(const {path,nearest,site} of entries){
    for(const [x,z] of [...path.slice(5,-2).filter((_,i)=>i%5===0),nearest]){
      const d=.03;
      const gap=uncovered([[x-d,z-d],[x+d,z-d],[x+d,z+d],[x-d,z+d]]);
      expect(surfaceArea(gap),`Plot ${site.id} at ${x}, ${z}`).toBeLessThan(1e-7);
    }
  }
});

it("paves the bench supports on both sides of each park seat",()=>{
  const count=0,sides=sidewalks(CITY_PLAN);
  const {patches}=gardenPavement(count,[...roadSurfaces(CITY_PLAN),...sides]);
  const uncovered=footwayClipper(patches.map(polygon=>({polygon})));
  for(const {site} of openSpaceEntries(count).filter(e=>e.site.interimForm==="park")){
    for(const bench of assembleInterim(site,false).filter(p=>p.module==="bench")){
      const [x,,z]=bench.at,c=Math.cos(bench.yaw),s=Math.sin(bench.yaw);
      for(const u of [-.90,.90])for(const v of [-.32,.32]){
        const px=x+c*u+s*v,pz=z-s*u+c*v,d=.01;
        expect(surfaceArea(uncovered([[px-d,pz-d],[px+d,pz-d],[px+d,pz+d],[px-d,pz+d]])),
          `Park ${site.id} bench at ${x},${z}`).toBeLessThan(1e-7);
      }
    }
  }
});
