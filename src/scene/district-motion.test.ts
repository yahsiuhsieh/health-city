import { expect, it } from "vitest";
import { stepsAt, SYNTHETIC_DAYS, trafficAt } from "../core/representative-day.ts";
import { onDiagonal,inlandBlocks, inlandNorth, inlandSouth, laneHalfWidth, crossings, groundHeight, PAVING_Y, ROAD_Y, stopLineX, streets, vehicleRoutes } from "./harbor-layout.ts";
import { districtMotion } from "./district-motion.ts";

it("fits the longest vehicle within the road on every bend and lowers both ends of each crossing", () => {
  const { coast, back, market, side, north, south, half } = streets;
  function onRoad(x: number, z: number) {
    const along = z >= south - half && z <= north + half && [coast, back].some(lane => Math.abs(x - lane) <= half);
    const across = x >= back - half && x <= coast + half && [market, side, north, south].some(lane => Math.abs(z - lane) <= half);
    const inlandAlong = z >= inlandSouth-half && z <= inlandNorth+half && [back,...inlandBlocks.map(b=>b.west)].some(lane=>Math.abs(x-lane)<=laneHalfWidth);
    const inlandAcross = x >= inlandBlocks[5]!.west-half && x <= back+half && [market,side,inlandNorth,inlandSouth].some(lane=>Math.abs(z-lane)<=laneHalfWidth);
    if ((Math.abs(x-inlandBlocks[0]!.west)<half && z>market+4.5 && z<inlandNorth-half) ||
        (Math.abs(x-inlandBlocks[4]!.west)<half && z>inlandSouth+half && z<side-half)) return false;
    return onDiagonal(x,z) || along || across || inlandAlong || inlandAcross;
  }
  for (const route of new Set(vehicleRoutes)) {
    for (let distance = 0; distance < route.length; distance += .23) {
      const { x, z, yaw } = route.at(distance);
      for (const end of [-2.33, 2.33]) for (const edge of [-.97, .97]) {
        expect(onRoad(x + end * Math.sin(yaw) + edge * Math.cos(yaw),
          z + end * Math.cos(yaw) - edge * Math.sin(yaw))).toBe(true);
      }
    }
  }
  for (const cross of crossings) for (const sign of [-1, 1]) {
    const height = (d: number) => groundHeight(cross.x + (cross.alongX ? sign * d : 0), cross.z + (cross.alongX ? 0 : sign * d));
    expect(height(streets.half)).toBeCloseTo(ROAD_Y);
    expect(height(streets.half + .725)).toBeCloseTo((ROAD_Y + PAVING_Y) / 2);
    expect(height(streets.half + 1.45)).toBeCloseTo(PAVING_Y);
  }
});

it("stops on an empty approach, yields to the shopper, and restores the queue after a backward seek", () => {
  const day = SYNTHETIC_DAYS[1];
  const motion = districtMotion(day);
  const car = (i: number, time: number) => vehicleRoutes[i]!.at(motion.driveDistance(i, time));
  expect(stepsAt(day, 600).pedestrianCount).toBe(0);
  let stoppedAt = 0;
  for (let time=12;time<day.durationSeconds-240;time+=12) {
    const pose = car(0,time);
    if (Math.abs(pose.x-(stopLineX-2.55))<.02 && Math.abs(pose.z-(streets.market+1.65))<.02 &&
      motion.driveDistance(0,time)===motion.driveDistance(0,time+60)) { stoppedAt=time; break; }
  }
  expect(stoppedAt).toBeGreaterThan(0);
  expect(motion.driveDistance(0,stoppedAt+300)).toBeGreaterThan(motion.driveDistance(0,stoppedAt));
  const marketDay = districtMotion(SYNTHETIC_DAYS[3]);
  const walker = marketDay.walkers[1]!;
  const before = walker.route.at(marketDay.walkDistance(1, 30500));
  const during = walker.route.at(marketDay.walkDistance(1, 31200));
  expect(before.z).toBeGreaterThan(streets.market + streets.half);
  expect(Math.abs(during.z-streets.market)).toBeLessThan(.5);
  expect(Math.abs(during.x-crossings[1].x)).toBeLessThan(1);
  expect(marketDay.driveDistance(0, 31200)).toBe(marketDay.driveDistance(0, 30500));
  expect(marketDay.driveDistance(0, 32800)).toBeGreaterThan(marketDay.driveDistance(0, 31200));
  const crossingTime=64608;
  const shopper=motion.walkers.findIndex(w=>w.style.asset==="pedestrian-shopper");
  const direct = districtMotion(day);
  expect(motion.walkDistance(shopper, crossingTime + .25)).toBe(direct.walkDistance(shopper, crossingTime + .25));
  expect(motion.driveDistance(0, crossingTime)).toBe(direct.driveDistance(0, crossingTime));
});

it("keeps active vehicles clear of each other and of people on the crossings across all five fixture days", () => {
  // A conservative rectangle covers both the pickup's length and the delivery van's width.
  type Pose = { x: number; z: number; yaw: number };
  function overlap(a: Pose, b: Pose) {
    return [a.yaw, a.yaw + Math.PI / 2, b.yaw, b.yaw + Math.PI / 2].every(axis => {
      const extent = (yaw: number) => 2.33 * Math.abs(Math.cos(axis - yaw)) + .97 * Math.abs(Math.sin(axis - yaw));
      const centerGap = (a.x - b.x) * Math.sin(axis) + (a.z - b.z) * Math.cos(axis);
      return Math.abs(centerGap) < extent(a.yaw) + extent(b.yaw);
    });
  }
  for (const day of SYNTHETIC_DAYS) {
    const motion = districtMotion(day);
    for (let time = 0; time < day.durationSeconds; time += 12) {
      const count = trafficAt(day, time).vehicleCount;
      const cars = vehicleRoutes.slice(0, count).map((route, i) => route.at(motion.driveDistance(i, time)));
      const people = motion.walkers.slice(0, stepsAt(day, time).pedestrianCount)
        .map((walker, i) => walker.route.at(motion.walkDistance(i, time)));
      for (const [i, car] of cars.entries()) {
        if (cars.slice(0, i).some(other => overlap(car, other))) throw new Error(day.date + " vehicle overlap at " + time);
        for (const person of people) {
          const dx = person.x - car.x, dz = person.z - car.z;
          const forward = dx * Math.sin(car.yaw) + dz * Math.cos(car.yaw);
          const lateral = dx * Math.cos(car.yaw) - dz * Math.sin(car.yaw);
          if (Math.abs(forward) < 2.55 && Math.abs(lateral) < 1.14) throw new Error(day.date + " pedestrian overlap at " + time);
        }
      }
    }
  }
});

it("takes every visible vehicle slot inland and reaches the outer road with one car", () => {
  for (const [i,route] of vehicleRoutes.entries()) {
    const positions = Array.from({length:Math.ceil(route.length)},(_,d)=>route.at(d).x);
    expect(Math.min(...positions)).toBeLessThan(i ? -95 : inlandBlocks[5]!.west);
    expect(Math.max(...positions)).toBeGreaterThanOrEqual(streets.back-2);
  }
});

it("takes the first pedestrian to the mountain foot and both residential streets on every fixture day",()=>{
  for(const day of SYNTHETIC_DAYS){
    const route=districtMotion(day).walkers[0]!.route;
    for(const [x,z] of [[-197.2,0],[-133,-22],[-133,18.2],[-4.3,3.6]] as const){
      const p=route.at(route.nearest(x,z));
      expect(Math.hypot(p.x-x,p.z-z)).toBeLessThan(1);
    }
  }
});
