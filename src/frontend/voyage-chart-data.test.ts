import {expect,it} from "vitest";
import {chartSpans,chartPath,chartPosition,fractionAt} from "./voyage-chart-data.ts";
import {SYNTHETIC_SESSION} from "../scene/sleep/session.ts";

it("gives every asleep second equal track length and every awakening zero length",()=>{
  const spans=chartSpans({...SYNTHETIC_SESSION,segments:[
    {stage:"AWAKE",start:0,end:20},{stage:"ASLEEP",start:20,end:120},{stage:"AWAKE",start:120,end:150},{stage:"REM",start:150,end:350}]});
  expect(spans.map(s=>s.to-s.from)).toEqual([0,1/3,0,1-1/3]);
  for(const t of [120,130,150])expect(fractionAt(spans,t)).toBe(1/3);
  expect(fractionAt(spans,50)).toBeCloseTo(.1);
  expect(fractionAt(spans,-10)).toBe(0);expect(fractionAt(spans,400)).toBe(1);
  function pathLength(a:number,b:number){
    const points=chartPath(a,b).slice(1).split("L").map(p=>p.split(" ").map(Number));
    return points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]!-points[i]![0]!,p[1]!-points[i]![1]!),0);
  }
  expect(pathLength(1/3,1)/pathLength(0,1/3)).toBeCloseTo(2,3);
  expect(chartPosition(0).x).toBeLessThan(chartPosition(1).x);
});
