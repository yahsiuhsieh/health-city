import { HARBOR_VEHICLE_LIMIT, stepsAt, trafficAt } from "../core/representative-day.ts";
import type { ReplayDay } from "../core/representative-day.ts";
import { dailyModelOrder } from "./seeded-order.ts";
import { cityWalk, neighborhoodWalk, plazaRoute, promenadeRoute, vehicleRoutes } from "./city/routes.ts";
import { signalApproaches, signalAt } from "./city/traffic-signals.ts";
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

const walkRoutes = [cityWalk, neighborhoodWalk, promenadeRoute, plazaRoute, cityWalk, neighborhoodWalk];
const CAR_START = walkRoutes.length;
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
  const carsToday = [vehicleRoutes[0]!, ...dailyModelOrder(vehicleRoutes.slice(1), "street-loops", day.date)].slice(0,HARBOR_VEHICLE_LIMIT);
  const walkGates = walkers.map(({ route }) => route.gates);
  const routes = [...walkers.map(w => w.route), ...carsToday];
  const offsets = [.35, .16, .70, .69, .9, .38, .57, .48, .11, .78];
  const histories = routes.map((route, i) => {
    const samples = new Float64Array(Math.ceil(day.durationSeconds / STEP) + 1);
    samples[0] = route.length * offsets[i]!;
    return samples;
  });
  const speeds = carsToday.map(() => CRUISE);
  const heldFor = carsToday.map(() => 0);
  const lastStop = carsToday.map(() => -Infinity);
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
        const inCrossing = route.gates.some(g => { const d=relative(distance,g.start,route.length); return d>-.5 && d<g.end-g.start+.5; });
        const occupied = walkers.slice(0, i).some((_, j) => Math.hypot(position(j).x - p.x, position(j).z - p.z) < .85);
        if (!inCrossing && !occupied) break;
        distance += 1.3;
      }
      histories[i]![tick] = distance;
    }
    for (let i = oldCars; i < newCars; i++) {
      const route = carsToday[i]!;
      let distance = histories[CAR_START + i]![tick]!;
      for (let tried = 0; tried < route.length; tried += 4) {
        const p = route.at(distance);
        const nearJunction = route.gates.some(g => { const d=relative(distance,g.start,route.length); return d>-2 && d<g.span+2; });
        const occupied = carsToday.slice(0, i).some((_, j) => Math.hypot(position(CAR_START + j).x - p.x, position(CAR_START + j).z - p.z) < 9);
        if (!nearJunction && !occupied) break;
        distance += 4;
      }
      histories[CAR_START + i]![tick] = distance;
      heldFor[i] = 0;
      lastStop[i] = -Infinity;
    }
  }
  placeArrivals(0,0,trafficAt(day,0).vehicleCount,0,stepsAt(day,0).pedestrianCount);
  function advance() {
    const time = last * STEP;
    const { pedestrianCount: walkCount, endSeconds } = stepsAt(day, time);
    const carCount = trafficAt(day, time).vehicleCount;
    const distances = histories.map(samples => samples[last]!);
    const cars = carsToday.map((route, i) => route.at(distances[CAR_START + i]!));
    const phases = signalApproaches.map((_,i) => signalAt(i,time));
    type Gate = typeof carsToday[number]["gates"][number];
    const claims = new Map<string,{car:number; gate:Gate; priority:number}>();
    const occupiedCrossings = new Set<number>();
    const waitingCrossings = new Set<number>();
    for (let i=0;i<walkCount;i++) {
      const {route} = walkers[i]!;
      for (const gate of route.gates) {
        const delta = relative(distances[i]!,gate.start,route.length);
        if (delta>.0001 && delta<gate.end-gate.start) occupiedCrossings.add(gate.crossing);
        if (delta>=-1 && delta<=.0001) waitingCrossings.add(gate.crossing);
      }
    }
    const inJunction = new Set<string>();
    function blocked(gate: Gate) {
      if (occupiedCrossings.has(gate.entry) || occupiedCrossings.has(gate.exit)) return true;
      if (gate.control==="signal" && gate.entry>=0) return phases[gate.entry]!.light!=="green";
      return waitingCrossings.has(gate.entry) || waitingCrossings.has(gate.exit);
    }
    for (let i=0;i<carCount;i++) {
      const route = carsToday[i]!;
      for (const gate of route.gates) {
        const delta = relative(distances[CAR_START+i]!,gate.start,route.length);
        if (delta < -9 || delta >= gate.span) continue;
        const inside = delta>.0001;
        if (inside) inJunction.add(gate.node);
        if (!inside && blocked(gate)) continue;
        const priority = inside ? -100-delta : -delta+(gate.stop?1:0);
        if (priority < (claims.get(gate.node)?.priority ?? Infinity))
          claims.set(gate.node,{car:i,gate,priority});
      }
    }
    for (const [i, { route, style }] of walkers.entries()) {
      let step = style.speed * STEP;
      for (const gate of walkGates[i]!) {
        const delta = relative(distances[i]!, gate.start, route.length);

        if (delta <= .0001 && delta >= -1) {
          const marker = Math.round(distances[i]! - delta);
          if (delta >= -.0001 && lastCurb[i] !== marker) {
            curbWait[i]! += STEP;
            if (curbWait[i]! >= 90) {
              lastCurb[i] = marker;
              curbWait[i] = 0;
            }
          }
          if (lastCurb[i] !== marker || inJunction.has(signalApproaches[gate.crossing]!.node.id) ||
              (signalApproaches[gate.crossing]!.node.control==="signal" && !phases[gate.crossing]!.walk)) step = Math.min(step, Math.max(0, -delta));
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
    for (const [i, route] of carsToday.entries()) {
      const distance = distances[CAR_START + i]!,
        car = cars[i]!;
      let room = Infinity;
      for (const gate of route.gates) {
        const delta = relative(distance,gate.start,route.length);
        if (delta > .0001 || delta < -12) continue;
        const marker = Math.round(distance-delta);
        let mustStop = false;
        if (gate.control==="stop" && gate.stop && lastStop[i]!==marker) {
          if (delta>=-.0001) heldFor[i]! += STEP;
          if (heldFor[i]!>=120) {lastStop[i]=marker; heldFor[i]=0;}
          else mustStop = true;
        }
        const owner = claims.get(gate.node);
        // Two turn lanes can depart together when their paths diverge.
        const other = owner?.gate;
        const separateTurns = other && gate.entry>=0 && gate.entry===other.entry &&
          ((gate.turn>.3 && other.turn<-.3 && gate.lane<other.lane) ||
           (other.turn>.3 && gate.turn<-.3 && other.lane<gate.lane));
        if (mustStop || blocked(gate) || (owner && owner.car!==i && !separateTurns))
          room = Math.min(room, Math.max(0,-delta));
      }
      for (let j = 0; j < cars.length; j++) {
        if (i === j || i < carCount && j >= carCount) continue;
        const other = cars[j]!,
          dx = other.x - car.x,
          dz = other.z - car.z;
        const ahead = dx * Math.sin(car.yaw) + dz * Math.cos(car.yaw);
        const across = Math.abs(dx * Math.cos(car.yaw) - dz * Math.sin(car.yaw));
        if (ahead > 0 && ahead < 12 && across < 2.1 && Math.cos(car.yaw - other.yaw) > .3) room = Math.min(room, Math.max(0, ahead - 5.85));
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
    vehicleRoutes: carsToday,
    walkDistance: (slot: number, seconds: number) => sample(slot, seconds),
    driveDistance: (slot: number, seconds: number) => sample(CAR_START + slot, seconds)
  };
}
export type DistrictMotion = ReturnType<typeof districtMotion>;
