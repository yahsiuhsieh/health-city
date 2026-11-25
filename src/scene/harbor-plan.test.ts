import {expect,it} from "vitest";

it("fits the design vessel in the shared basin and entrance",async()=>{
  const {HARBOR_MOUTH,turningBasin,armMarks,breakwaterArms}=await import("./city/harbor-plan.ts");
  const {basinClearance}=await import("./sleep/clearance.ts");
  const {buildSeabed}=await import("./ocean/seabed.ts");
  expect(breakwaterArms).toHaveLength(2);
  expect(turningBasin.radius*2).toBe(36);
  expect(basinClearance(turningBasin.center,turningBasin.radius)).toBeGreaterThanOrEqual(6);
  const xs=breakwaterArms.flatMap(arm=>arm.map(p=>p[0])),zs=breakwaterArms.flatMap(arm=>arm.map(p=>p[1]));
  expect(Math.max(...xs)-Math.min(...xs)).toBeLessThanOrEqual(95);
  expect(Math.max(...zs)-Math.min(...zs)).toBeLessThanOrEqual(80);
  const heads=breakwaterArms.slice(-2).map(arm=>arm.at(-1)!);
  const starboard=heads.findIndex(head=>head[1]<HARBOR_MOUTH.point[1]);
  expect(armMarks[starboard]).toBe("red");
  expect(Math.abs(heads[0]![1]-heads[1]![1])-6).toBeGreaterThanOrEqual(30);
  const bed=buildSeabed();
  try{
    expect(bed.depthAt(...turningBasin.center)).toBeCloseTo(7,1);
    expect(bed.depthAt(...HARBOR_MOUTH.point)).toBeGreaterThanOrEqual(8);
  }finally{bed.texture.dispose();}
});
