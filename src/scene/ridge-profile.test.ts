import { expect,it } from "vitest";
import { ridgeProfile,elevation,ridgeSurface } from "./ridge-profile.ts";
import { recordedReplayDay } from "../core/representative-day.ts";

it("keeps peaks at their midpoints and separates missing intervals",()=>{
  const values=[null,63.087,140,70,null,null,95,null];
  const ridge=ridgeProfile(values);
  values.forEach((v,i)=>expect(ridge.height((i+.5)/values.length)).toBeCloseTo(v===null?0:elevation(v)));
  for(let i=0;i<800;i++) expect(ridge.height(i/800)).toBeLessThanOrEqual(elevation(140));
  expect(ridge.ranges.filter(r=>!r.valid).map(r=>[r.start,r.end])).toEqual([[0,1],[4,6],[7,8]]);
  expect(ridge.height(6/8)).toBe(elevation(95));
  expect(ridge.height(6.999/8)).toBe(elevation(95));
});
it("indexes elapsed time through both daylight saving transitions",()=>{
  const fall=recordedReplayDay("2026-11-01"),spring=recordedReplayDay("2026-03-08");
  expect(fall.heartMeans.length).toBe(300);
  expect(spring.heartMeans.length).toBe(276);
  expect(fall.replayLabel(3600)).toBe("01:00");
  expect(fall.replayLabel(7200)).toBe("01:00");
});

it("connects the rails through short, long and single-ended gaps without creating a heart-rate peak",()=>{
  for(const values of [[68,null,86],[62,...Array<number|null>(50).fill(null),94],[null,null,80],[72,null,null]]){
    const profile=ridgeProfile(values);
    for(let i=0;i<=values.length*20;i++){
      const u=i/(values.length*20),rail=profile.track(u);
      expect(rail.y).toBeGreaterThan(4);
      if(values[profile.index(u)]===null)expect(profile.height(u)).toBe(0);
      if(i)expect(Math.abs(rail.y-profile.track((i-1)/(values.length*20)).y)).toBeLessThan(.5);
    }
  }
});

it("keeps every interpolated value between the adjacent interval elevations",()=>{
  const values=[58,82,130,129,57,57,106,75];
  const ridge=ridgeProfile(values);
  for(let i=1;i<values.length;i++){
    const a=elevation(values[i-1]!),b=elevation(values[i]!);
    for(let j=0;j<=100;j++){
      const height=ridge.height((i-.5+j/100)/values.length);
      expect(height).toBeGreaterThanOrEqual(Math.min(a,b)-1e-10);
      expect(height).toBeLessThanOrEqual(Math.max(a,b)+1e-10);
    }
  }
});

it("keeps the seeded flank relief below the local crest",()=>{
  const ridge=ridgeProfile([55,73,61,110,74,83]);
  for(let i=0;i<=80;i++){
    const u=i/80;
    for(let x=-255;x<=ridge.x(u)+18;x+=.7)expect(ridgeSurface(ridge,u,x)).toBeLessThanOrEqual(ridge.height(u));
  }
});
