import { stepsAt, trafficAt } from "../core/representative-day.ts";
import type { ReplayDay } from "../core/representative-day.ts";
import { dailyModelOrder } from "./seeded-order.ts";
import { cityWalk, branchRoute, neighborhoodWalk, diagonal, inlandBlocks, inlandNorth, inlandSouth, crossings, plazaRoute, promenadeRoute, stopDistance, streets, vehicleRoutes } from "./harbor-layout.ts";
import type { StreetRoute } from "./loop-path.ts";
import { walkingPace } from "./walk-route.ts";

export const walkerStyles = [
  { asset:"harbor-pedestrian", speed:.0044, strideLength:.91, arms:[.175,.14], lean:.036 },
  { asset:"pedestrian-commuter", speed:.0054, strideLength:1.02, arms:[.065,.15], lean:.024 },
  { asset:"pedestrian-hiker", speed:.0047, strideLength:.94, arms:[.14,.16], lean:.052 },
  { asset:"pedestrian-crew", speed:.0045, strideLength:.89, arms:[.15,.18], lean:.038 },
  { asset:"pedestrian-promenade", speed:.004, strideLength:.85, arms:[.12,.15], lean:.026 },
  { asset:"pedestrian-child", speed:.0039, strideLength:.59, arms:[.21,.185], lean:.045 },
  { asset:"pedestrian-shopper", speed:.0033, strideLength:.73, arms:[.13,.035], lean:.024 },
] as const;

// Find each passage through a crosswalk once. A route can cross it in both directions.
function passage(route: StreetRoute, inside: (distance: number) => boolean) {
  const spans: {
    start: number;
    end: number;
  }[] = [];
  let origin = 0;
  while (origin < route.length && inside(origin)) origin++;
  if (origin >= route.length) return [{
    start: 0,
    end: route.length
  }];
  let start: number | undefined;
  for (let d = origin; d <= origin + route.length + .11; d += .1) {
    if (inside(d)) {
      start ??= d;
    } else if (start !== undefined) {
      spans.push({
        start,
        end: d
      });
      start = undefined;
    }
  }
  return spans;
}
function crossingGates(route: StreetRoute, pedestrian: boolean) {
  const gates: {
    crossing: number;
    start: number;
    end: number;
  }[] = [];
  for (const [index, c] of crossings.entries()) {
    const inside = (distance: number) => {
      const p = route.at(distance),
        dx = Math.abs(p.x - c.x),
        dz = Math.abs(p.z - c.z);
      return (c.alongX ? dx : dz) <= streets.half + (pedestrian ? .3 : .85) && (c.alongX ? dz : dx) <= (pedestrian ? 1.6 : 3.85);
    };
    gates.push(...passage(route, inside).map(span => ({
      ...span,
      crossing: index
    })));
  }
  return gates;
}
const walkRoutes = [cityWalk, neighborhoodWalk, cityWalk, plazaRoute, cityWalk, neighborhoodWalk];
const CAR_START = walkRoutes.length;
const intersections = [streets.coast, streets.back,...inlandBlocks.map(block=>block.west)].flatMap(x => [streets.market, streets.side, streets.north, streets.south, inlandNorth, inlandSouth].map(z => ({
  x,
  z
})));
intersections.push({x:diagonal[1][0],z:diagonal[1][1]});
const junctionGates = vehicleRoutes.map(route => intersections.flatMap(({
  x,
  z
}, junction) => passage(route, d => {
  const p = route.at(d);
  return Math.abs(p.x - x) < 6.15 && Math.abs(p.z - z) < 6.15;
}).map(span => ({
  ...span,
  junction
}))));
const carGates = vehicleRoutes.map(route => crossingGates(route, false));
function relative(distance: number, start: number, length: number) {
  return ((distance - start + length / 2) % length + length) % length - length / 2;
}

// Fixed replay-time samples make queues reversible. Compute new samples only on first visit.
const STEP = 6;
const CRUISE = .017;
export function districtMotion(day: ReplayDay) {
  const roster = dailyModelOrder(walkerStyles, "harbor-walk", day.date);
  const walkers = walkRoutes.map((route, i) => ({
    route: i!==0 && roster[i]!.asset === "pedestrian-shopper" ? promenadeRoute : route,
    style: roster[i]!
  }));
  const walkGates = walkers.map(({ route }) => crossingGates(route, true));
  const routes = [...walkers.map(w => w.route), ...vehicleRoutes];
  const offsets = [.19, .16, .64, .69, .9, .38, .16, .48, .11, .78];
  const histories = routes.map((route, i) => {
    const samples = new Float64Array(Math.ceil(day.durationSeconds / STEP) + 1);
    samples[0] = route.length * offsets[i]!;
    return samples;
  });
  const speeds = vehicleRoutes.map(() => CRUISE);
  const heldFor = vehicleRoutes.map(() => 0);
  const releasedLap = vehicleRoutes.map(() => -Infinity);
  const curbWait = walkers.map(() => 0);
  const lastCurb = walkers.map(() => -Infinity);
  let last = 0;
  // Newly visible slots enter on a clear stretch. A hidden vehicle cannot reserve a junction.
  function placeArrivals(tick: number, oldCars: number, newCars: number, oldWalkers: number, newWalkers: number) {
    const position = (index: number) => routes[index]!.at(histories[index]![tick]!);
    for (let i = oldWalkers; i < newWalkers; i++) {
      const route = walkers[i]!.route;
      let distance = histories[i]![tick]!;
      for (let tried = 0; tried < route.length; tried += 1.3) {
        const p = route.at(distance);
        const inCrossing = crossings.some(c => Math.abs(p.x - c.x) < 4.4 && Math.abs(p.z - c.z) < 4.4);
        const occupied = walkers.slice(0, i).some((_, j) => Math.hypot(position(j).x - p.x, position(j).z - p.z) < .85);
        if (!inCrossing && !occupied) break;
        distance += 1.3;
      }
      histories[i]![tick] = distance;
    }
    for (let i = oldCars; i < newCars; i++) {
      const route = vehicleRoutes[i]!;
      let distance = histories[CAR_START + i]![tick]!;
      for (let tried = 0; tried < route.length; tried += 4) {
        const p = route.at(distance);
        const nearJunction = intersections.some(c => Math.abs(p.x - c.x) < 10 && Math.abs(p.z - c.z) < 10);
        const occupied = vehicleRoutes.slice(0, i).some((_, j) => Math.hypot(position(CAR_START + j).x - p.x, position(CAR_START + j).z - p.z) < 9);
        if (!nearJunction && !occupied) break;
        distance += 4;
      }
      histories[CAR_START + i]![tick] = distance;
      heldFor[i] = 0;
    }
  }
  function advance() {
    const time = last * STEP;
    const { pedestrianCount: walkCount, endSeconds } = stepsAt(day, time);
    const carCount = trafficAt(day, time).vehicleCount;
    const distances = histories.map(samples => samples[last]!);
    const cars = vehicleRoutes.map((route, i) => route.at(distances[CAR_START + i]!));
    const junctions = intersections.map(() => ({
      owner: -1,
      approach: Infinity
    }));
    for (let i = 0; i < carCount; i++) for (const gate of junctionGates[i]!) {
      const delta = relative(distances[CAR_START + i]!, gate.start, vehicleRoutes[i]!.length);
      if (delta <= -9 || delta >= gate.end - gate.start) continue;
      // A vehicle inside the junction keeps priority until its rear clears.
      const remaining = delta > .001 ? -1 : Math.max(0, -delta);
      const claim = junctions[gate.junction]!;
      if (remaining < claim.approach) {
        claim.approach = remaining;
        claim.owner = i;
      }
    }
    const pedestrianHasPriority = crossings.map(() => false);
    const vehicleInCrossing = crossings.map(() => false);
    for (let i = 0; i < carCount; i++) for (const gate of carGates[i]!) {
      const delta = relative(distances[CAR_START + i]!, gate.start, vehicleRoutes[i]!.length);
      if (delta > .02 && delta < gate.end - gate.start) vehicleInCrossing[gate.crossing] = true;
    }
    for (const [i, { route, style }] of walkers.entries()) {
      let step = style.speed * STEP;
      for (const gate of walkGates[i]!) {
        const delta = relative(distances[i]!, gate.start, route.length);
        if (delta >= -1.55 && delta < gate.end - gate.start && i < walkCount) pedestrianHasPriority[gate.crossing] = true;
        if (delta <= .0001 && delta >= -1) {
          const marker = Math.round(distances[i]! - delta);
          if (delta >= -.0001 && lastCurb[i] !== marker) {
            curbWait[i]! += STEP;
            if (curbWait[i]! >= 90) {
              lastCurb[i] = marker;
              curbWait[i] = 0;
            }
          }
          if (lastCurb[i] !== marker || vehicleInCrossing[gate.crossing]) step = Math.min(step, Math.max(0, -delta));
        }
      }
      // Leave space for a slower walker on the same pavement.
      for (let j = 0; j < walkers.length; j++) {
        if (i === j || j >= walkCount && i < walkCount || route !== walkers[j]!.route) continue;
        const gap = relative(distances[j]!, distances[i]!, route.length);
        if (gap > 0 && gap < 1.05) step = Math.min(step, Math.max(0, gap - .85));
      }
      step *= walkingPace(route, distances[i]!);
      histories[i]![last + 1] = distances[i]! + step;
    }
    for (const [i, route] of vehicleRoutes.entries()) {
      const distance = distances[CAR_START + i]!,
        car = cars[i]!;
      let room = Infinity;
      if (route === branchRoute) {
        const stop = relative(distance, stopDistance, route.length);
        const lap = Math.round((distance - stopDistance) / route.length);
        if (pedestrianHasPriority[1] && stop <= .001 && stop > -12) room = Math.min(room, Math.max(0, -stop));
        if (stop < .02 && stop > -12 && releasedLap[i] !== lap) {
          if (stop >= -.001) heldFor[i]! += STEP;
          if (heldFor[i]! >= 120) {
            releasedLap[i] = lap;
            heldFor[i] = 0;
          } else room = Math.min(room, Math.max(0, -stop));
        }
      }
      for (const gate of carGates[i]!) {
        const delta = relative(distance, gate.start, route.length);
        if (pedestrianHasPriority[gate.crossing] && delta <= .02 && delta > -12) room = Math.min(room, Math.max(0, -delta));
      }
      for (let j = 0; j < cars.length; j++) {
        if (i === j || i < carCount && j >= carCount) continue;
        if (route === vehicleRoutes[j]) {
          const gap = relative(distances[CAR_START + j]!, distance, route.length);
          if (gap > 0 && gap < 12) room = Math.min(room, Math.max(0, gap - 6.05));
        }
        const other = cars[j]!,
          dx = other.x - car.x,
          dz = other.z - car.z;
        const ahead = dx * Math.sin(car.yaw) + dz * Math.cos(car.yaw);
        const across = Math.abs(dx * Math.cos(car.yaw) - dz * Math.sin(car.yaw));
        if (ahead > 0 && ahead < 12 && across < 2.1 && Math.cos(car.yaw - other.yaw) > .3) room = Math.min(room, Math.max(0, ahead - 5.85));
      }
      for (const gate of junctionGates[i]!) {
        const delta = relative(distance, gate.start, route.length);
        const owner = junctions[gate.junction]!.owner;
        const crossesOtherTraffic = owner >= 0 && owner !== i;
        if (crossesOtherTraffic && delta <= .0001 && delta > -12) {
          room = Math.min(room, Math.max(0, -delta));
        }
      }
      const desired = Math.min(CRUISE, Math.sqrt(.00009 * Math.max(0, room)));
      speeds[i] = Math.min(desired, speeds[i]! + .00024 * STEP);
      histories[CAR_START + i]![last + 1] = distance + Math.min(room, speeds[i]! * STEP);
    }
    last++;
    if (last * STEP === endSeconds) {
      const nextCars = trafficAt(day, last * STEP).vehicleCount;
      const nextWalkers = stepsAt(day, last * STEP).pedestrianCount;
      placeArrivals(last, carCount, nextCars, walkCount, nextWalkers);
    }
  }
  function sample(slot: number, seconds: number) {
    const t = Math.max(0, Math.min(seconds, day.durationSeconds)) / STEP;
    const lo = Math.floor(t),
      hi = Math.min(Math.ceil(t), histories[slot]!.length - 1);
    while (last < hi) advance();
    const samples = histories[slot]!;
    return samples[lo]! + (samples[hi]! - samples[lo]!) * (t - lo);
  }
  return {
    walkers,
    walkDistance: (slot: number, seconds: number) => sample(slot, seconds),
    driveDistance: (slot: number, seconds: number) => sample(CAR_START + slot, seconds)
  };
}
export type DistrictMotion = ReturnType<typeof districtMotion>;
