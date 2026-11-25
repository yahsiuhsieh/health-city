import { daySleepVoyages } from "../core/sleep-replay.ts";
import { SYNTHETIC_SESSION } from "./sleep/session.ts";
import {expect,it} from "vitest";
import {asleepMinutes,departure,sessionSeconds,voyage,wake} from "./sleep-voyage.ts";

it("continues the same sleep voyage at midnight and restores a paused awakening",()=>{
  const [first]=daySleepVoyages([SYNTHETIC_SESSION],"2026-11-11","America/Chicago");
  const [next]=daySleepVoyages([SYNTHETIC_SESSION],"2026-11-12","America/Chicago");
  expect(voyage(first!,86400)).toEqual(voyage(next!,0));
  const paused=voyage(first!,departure+wake.start);
  expect(paused.stage).toBe("AWAKE");
  expect(voyage(first!,departure+wake.end-1)).toEqual({...paused,t:wake.end-1});
  expect(asleepMinutes).toBe(442);
  expect(voyage(first!,departure+sessionSeconds).stage).toBe("At island");
  expect(voyage(first!,departure+sessionSeconds+1200).stage).toBe("Returning");
  expect(voyage(first!,departure+sessionSeconds+4200).moored).toBe(true);
  expect(voyage(null,3600).progress).toBe(0);
});
