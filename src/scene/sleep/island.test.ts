import { mistBank } from "./mist-bank.ts";
import {expect,it} from "vitest";
import { islandShape,polygonArea } from "./island-shape.ts";
import { islandLayout,colonies } from "./island-layout.ts";
import { islandSeabed,reefProfile } from "./reef.ts";
import { JETTY_HEAD,ROUTE_LENGTH,routeFrame,returnFrame } from "./route.ts";
import { pointClearance } from "./clearance.ts";
import { SYNTHETIC_SESSION as session } from "./session.ts";
import { cabinState } from "./vessel-state.ts";

const sizes=[5,20,60,180,442,720];
it("scales the dry cay independently of the submerged reef at all six sizes",()=>{
  for(const minutes of sizes){
    const land=islandShape(session,minutes),reef=land.reef.bounds;
    expect(polygonArea(land.polygon)).toBeCloseTo(24*minutes,5);
    expect(polygonArea(land.reef.polygon)).toBeCloseTo(Math.max(15000,60*minutes),5);
    const ratio=(reef.right-reef.left)/(reef.top-reef.bottom);
    expect(ratio).toBeGreaterThanOrEqual(1.6);expect(ratio).toBeLessThanOrEqual(2.2);
    expect(reef.top-land.bounds.top).toBeGreaterThanOrEqual(25);
    expect(Math.max(...land.polygon.map(p=>land.reef.distance(...p)))).toBeLessThan(0);
    expect(land.distance(...land.shore)).toBeCloseTo(0,4);
    expect(land.pier).toEqual(islandShape(session,442).pier);
    const crown=land.elevation(...land.center);
    if(minutes>=60){expect(crown).toBeGreaterThan(1.45);expect(crown).toBeLessThanOrEqual(minutes===720?5:3.5);}
    const stageChange={...session,segments:[{stage:"REM" as const,start:0,end:minutes*60}]};
    expect(islandShape(stageChange).polygon).toEqual(land.polygon);
  }
});
it("restores cay and reef shapes from the session seed",()=>{
  expect(islandShape(session).polygon).toEqual(islandShape(session).polygon);
  expect(islandShape({...session,id:"second"}).reef.polygon).not.toEqual(islandShape(session).reef.polygon);
});
it("builds distinct shallow zones and a continuous shallow reef crest",()=>{
  for(const minutes of sizes){
    const land=islandShape(session,minutes),zones=new Set<string>();
    for(let x=land.reef.bounds.left-25;x<land.reef.bounds.right+25;x+=2){
      for(let z=land.reef.bounds.bottom-25;z<land.reef.bounds.top+25;z+=2){
        const p=reefProfile(land,x,z);
        if(p.shore<0)continue;
        zones.add(p.zone);
        const range={toe:[0,.8],lagoon:[.8,2.5],flat:[.4,1.2],crest:[.2,.6],slope:[.19,22],sea:[22,40]}[p.zone]!;
        if(p.depth<range[0]!-1e-6 || p.depth>range[1]!+1e-6)throw Error(p.zone+" depth "+p.depth);
      }
    }
    expect(zones.size).toBe(6);
    const crest=land.reef.polygon.filter(([x,z])=>{
      const dx=land.reef.center[0]-x,dz=land.reef.center[1]-z,r=Math.hypot(dx,dz);
      return reefProfile(land,x+2*dx/r,z+2*dz/r).zone==="crest";
    });
    expect(crest.length/land.reef.polygon.length).toBeGreaterThanOrEqual(.8);
  }
});
it("keeps trees off a five-minute sandbank and restores the coral clusters",()=>{
  const small=islandLayout(islandShape(session,5)),nap=islandLayout(islandShape(session,20));
  expect(small.some(p=>p.name.startsWith("palm")||p.name.startsWith("broadleaf"))).toBe(false);
  expect(nap.filter(p=>p.name.startsWith("palm")).length).toBe(2);
  const land=islandShape(session),items=islandLayout(land);
  expect(islandLayout(land)).toEqual(items);
  for(const name of colonies)expect(items.some(p=>p.name===name+"-a")).toBe(true);
  for(const p of items.filter(p=>p.wet)){
    const {zone}=reefProfile(land,p.x,p.z);expect(zone).not.toBe("sea");expect(zone).not.toBe("toe");
  }
});
it("keeps the swept hull clear of all six shelves and both fixed deck edges",()=>{
  const poses=[];
  for(let s=ROUTE_LENGTH-240;s<=ROUTE_LENGTH;s+=.25)poses.push(routeFrame(s));
  for(let i=0;i<=14400;i++){const p=returnFrame(i/14400);if(p.x>JETTY_HEAD[0]-240)poses.push(p);}
  for(const minutes of sizes){
    const land=islandShape(session,minutes),bed=islandSeabed(land);
    let minDepth=40,deckGap=Infinity;
    try{
      for(const p of poses){
        if(p.z>JETTY_HEAD[1]+12)continue;
        const c=Math.cos(p.yaw),s=Math.sin(p.yaw);
        for(const u of [-11.8,-7,0,7,11.8])for(const v of [-4.4,0,4.4]){
          const x=p.x+c*u+s*v,z=p.z-s*u+c*v;
          minDepth=Math.min(minDepth,bed.depthAt(x,z));
        }
        for(let u=-7;u<=7;u+=.5){
          const gap=pointClearance(p,land.pier[0]+u,land.pier[1]+1.5,0);
          deckGap=Math.min(deckGap,gap+(p.maneuver==="lateral"?1.5:0));
        }
      }
      expect(minDepth).toBeGreaterThanOrEqual(2.6);expect(deckGap).toBeGreaterThanOrEqual(0);
    }finally{bed.texture.dispose();}
  }
});
it("restores the cabin, anchor and companions from session time",()=>{

  expect(cabinState(session,3700).closed).toBe(1);
  expect(cabinState(session,14400+240)).toMatchObject({anchor:1,bright:1});
  expect(cabinState(session,14400+480).anchor).toBe(0);
});

it("clusters natural objects without regular spacing and keeps the crest covered",()=>{
  const land=islandShape(session),items=islandLayout(land);
  const families=new Map<string,typeof items>();
  for(const p of items){
    const name=p.name.slice(0,-2),family=families.get(name);
    if(family)family.push(p);else families.set(name,[p]);
  }
  for(const [family,points] of families){
    const nearest=points.map((p,i)=>{
      let d=Infinity;
      for(let j=0;j<points.length;j++)if(i!==j){
        const q=points[j]!;d=Math.min(d,(p.x-q.x)**2+(p.z-q.z)**2);
      }
      return Math.sqrt(d);
    });
    const mean=nearest.reduce((a,b)=>a+b,0)/nearest.length;
    const sd=Math.sqrt(nearest.reduce((a,b)=>a+(b-mean)**2,0)/nearest.length);
    expect(sd/mean,family).toBeGreaterThanOrEqual(.25);
  }
  const mounds=families.get("bommie")!;
  expect(mounds.some(p=>reefProfile(land,p.x,p.z).zone==="lagoon" && Math.abs(p.x-land.pier[0])<18)).toBe(true);
  const covered=land.reef.polygon.filter(([x,z])=>mounds.some(m=>Math.hypot(x-m.x,z-m.z)<m.scale[0]+1.5));
  expect(covered.length/land.reef.polygon.length).toBeGreaterThanOrEqual(.8);
});

it("covers each reef outline and its 30 m margin before the mist clears",()=>{
  for(const size of sizes){
    const land=islandShape(session,size),bank=mistBank(land);
    expect(bank.center).toEqual(land.reef.center);
    for(const [i,a] of land.reef.polygon.entries()){
      const b=land.reef.polygon[(i+1)%land.reef.polygon.length]!;
      const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
      for(const d of [0,15,30])expect(bank.density((a[0]+b[0])/2+d*dz/len,(a[1]+b[1])/2-d*dx/len)).toBeCloseTo(1,4);
    }
  }
});
