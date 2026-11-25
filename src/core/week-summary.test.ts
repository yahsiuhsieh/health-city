import {expect,it} from "vitest";
import {earlierAverage,summarizeReplay} from "./week-summary.ts";
import {emptyDay} from "../worker/metric-history.ts";
import {dayWindow} from "../worker/health-data.ts";
import {syntheticWeek} from "./synthetic-week.ts";

it.each([7,3,2,0])("counts %i available dates and excludes missing values",count=>{
  expect(earlierAverage([...Array<number>(count).fill(56),...Array<null>(7-count).fill(null)]))
    .toEqual({count,mean:count?56:null});
});

it("assigns an overnight session and a nap to the local end date",()=>{
  const day=emptyDay(dayWindow("2026-03-08","America/Chicago")!);
  day.steps={status:"ready",value:Array<number>(276).fill(0)};
  day.sleep={status:"ready",value:[
    {id:"overnight",startTime:"2026-03-08T04:00:00Z",segments:[{stage:"REM",start:0,end:3*3600}]},
    {id:"nap",startTime:"2026-03-08T16:00:00Z",segments:[{stage:"LIGHT",start:0,end:900}]},
    {id:"following",startTime:"2026-03-09T04:00:00Z",segments:[{stage:"DEEP",start:0,end:3*3600}]},
  ]};
  const result=summarizeReplay(day);
  expect(result.sleep).toMatchObject({seconds:11700,stages:{REM:10800,LIGHT:900,DEEP:0}});
  expect(result.steps).toMatchObject({status:"ready",daySeconds:82800,total:0});
});

it("keeps a synthetic date identical across consecutive windows",()=>{
  const previous=syntheticWeek("2026-11-14").days;
  expect(syntheticWeek("2026-11-15").days.slice(0,-1)).toEqual(previous.slice(1));
});
