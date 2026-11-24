import { describe,expect,it } from "vitest";
import { Color,DataUtils } from "three";
import { coast } from "../coastline.ts";
import { ambientTime } from "./ambient-time.ts";
import { absorbedColor } from "./absorption.ts";
import { buildSeabed } from "./seabed.ts";
import { previewWake, previewStop, voyageWake } from "./wake.ts";
import { scheduledSplashes, splashAge, visibleSchedule } from "./splash-schedule.ts";
import { sessionSeconds, wake } from "../sleep-voyage.ts";

it("uses the same ambient clock for every ocean effect",()=>{
  expect(ambientTime(0)).toBe(0);
  expect(ambientTime(190)).toBe(1);
});

it("preserves shallow sand and converges to cobalt at depth",()=>{
  const sand=new Color("#e6d6a8").toArray(), deep=new Color("#195b85").toArray();
  for(const [i,c] of absorbedColor(sand,deep,.3).entries())
    expect(Math.abs(c-sand[i]!)).toBeLessThan(Math.abs(c-deep[i]!));
  for(const [i,c] of absorbedColor(sand,deep,30).entries())
    expect(Math.abs(c-deep[i]!)).toBeLessThan(.03*deep[i]!);
});

it("keeps the shelf profiles and CPU depths consistent with the filtered texture",()=>{
  const bed=buildSeabed({extraLand:[{polygon:[[100,0],[110,0],[110,10],[100,10]],shoreWidth:8}]});
  try {
    const soft=coast.find(s=>s.width>2 && s.waterline[0]<-100 && s.waterline[1]>65)!;
    const quay=coast.find(s=>s.width===0 && s.waterline[1]<-28 && s.waterline[1]>-35)!;
    expect(Math.abs(bed.depthAt(...quay.waterline)-6)).toBeLessThan(.2);
    const [x,z]=soft.toe,dx=x-soft.crest[0],dz=z-soft.crest[1],length=Math.hypot(dx,dz);
    let last=bed.depthAt(x,z);
    expect(Math.abs(last-1.15)).toBeLessThan(.05);
    for(let i=1;i<=65;i++){
      const d=bed.depthAt(x+i*dx/length,z+i*dz/length);
      expect(d).toBeGreaterThan(last);last=d;
    }
    expect(bed.depthAt(100,5)).toBeCloseTo(0,1);
    expect(bed.depthAt(98,5)).toBeGreaterThan(0);
    const {width,height,data}=bed.texture.image;
    let seed=42;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let n=0;n<200;n++){
      const px=random()*(width-1), pz=random()*(height-1), ix=Math.floor(px),iz=Math.floor(pz);
      let sum=0;
      for(let j=0;j<2;j++)for(let i=0;i<2;i++){
        const weight=(i?px-ix:1-px+ix)*(j?pz-iz:1-pz+iz);
        sum+=DataUtils.fromHalfFloat(data![((iz+j)*width+ix+i)*4]!)*weight*40;
      }
      const wx=bed.bounds.x+(px+.5)*bed.bounds.z/width,wz=bed.bounds.y+(pz+.5)*bed.bounds.w/height;
      expect(Math.abs(bed.depthAt(wx,wz)-sum)).toBeLessThan(.05);
    }
  }finally{bed.texture.dispose();}
});

describe("boat wake",()=>{
  it("samples a curve from the stern at one-metre intervals after a seek",()=>{
    const sample=previewWake.sample(2130);
    expect(sample.points).toHaveLength(56);
    for(let i=1;i<sample.points.length;i++){
      const a=sample.points[i-1]!,b=sample.points[i]!;
      expect(b.behind).toBe(i);expect(Math.hypot(a.x-b.x,a.z-b.z)).toBeCloseTo(1,2);
    }
    previewWake.sample(320);
    expect(previewWake.sample(2130)).toEqual(sample);
  });
  it("fades at a stop and leaves moored water clear",()=>{
    expect(previewWake.sample(previewStop+300).strength).toBe(.5);
    expect(previewWake.sample(previewStop+600).strength).toBe(0);
    expect(voyageWake(null).sample(43200).strength).toBe(0);
    expect(voyageWake(0).sample(sessionSeconds+9000).strength).toBe(0);
    expect(voyageWake(0).sample(wake.start+300).strength).toBe(.5);
    const active=voyageWake(0).sample(8640);
    expect(active.strength).toBe(1);expect(active.points.length).toBeGreaterThan(1);
  });
});

it("repeats seeded splash events and excludes shallow water and boat paths",()=>{
  const candidates=[];
  for(let x=-4;x<4;x++)for(let z=-4;z<4;z++){
    const cell={x,z};
    const events=scheduledSplashes(cell,()=>10,[]);
    expect(events.length).toBeLessThanOrEqual(2);
    expect(scheduledSplashes(cell,()=>10,[])).toEqual(events);
    expect(scheduledSplashes(cell,()=>4,[])).toEqual([]);
    for(const event of events) {
      expect(scheduledSplashes(cell,()=>10,[{x:event.x+11,z:event.z}])).not.toContainEqual(event);
      expect(splashAge(event.start+30.3,event)).toBeCloseTo(.3);
    }
    candidates.push(...events);
  }
  const view=visibleSchedule(candidates);
  expect(view.length/3).toBeGreaterThanOrEqual(.5);
  expect(view.length/3).toBeLessThanOrEqual(1.5);
});

it("samples 40 m of open water between the independent city and island shelves",async()=>{
  const {JETTY_HEAD,routeFrame}=await import("../sleep/route.ts");
  const [x,z]=JETTY_HEAD;
  const city=buildSeabed(),island=buildSeabed({coastline:[],extraLand:[{
    polygon:[[x,z-10],[x+20,z-10],[x+20,z-30],[x,z-30]],shoreWidth:7,revealKey:1
  }]});
  try{
    expect(city.bounds.x+city.bounds.z).toBeLessThan(island.bounds.x);
    for(let s=200;s<=850;s+=5){
      const p=routeFrame(s);
      for(const bed of [city,island]){
        expect(bed.contains(p.x,p.z)).toBe(false);
        expect(bed.depthAt(p.x,p.z)).toBe(40);
      }
    }
  }finally{city.texture.dispose();island.texture.dispose();}
});
