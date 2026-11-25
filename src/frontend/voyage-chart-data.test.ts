import {expect,it} from "vitest";
import {chartSpans,chartPath,chartPosition} from "./voyage-chart-data.ts";
import {SYNTHETIC_SESSION} from "../scene/sleep/session.ts";
import {routeDistanceAt} from "../scene/sleep/timeline.ts";

it("aligns each chart leg with the ship and holds position during an awakening",()=>{
  for(const s of chartSpans(SYNTHETIC_SESSION)){
    expect(s.s0).toBeCloseTo(routeDistanceAt(SYNTHETIC_SESSION,s.start));
    expect(s.s1).toBeCloseTo(routeDistanceAt(SYNTHETIC_SESSION,s.end));
    if(s.stage==="AWAKE")expect(s.s0).toBe(s.s1);
    const p=chartPosition(s.s1);
    expect(chartPath(s.s0,s.s1)).toMatch("L"+p.x.toFixed(2)+" "+p.y.toFixed(2));
  }
});
