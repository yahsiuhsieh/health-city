import { expect, it } from "vitest";
import { stepsAt, SYNTHETIC_DAYS, trafficAt } from "../core/representative-day.ts";
import { CITY_PLAN } from "./city/city-plan.data.ts";
import { cityWalk, crossings, neighborhoodWalk, plazaRoute, promenadeRoute, vehicleRoutes, walkingHeight } from "./city/routes.ts";
import { roadSurfaces } from "./city/street-graph.ts";
import type { Point } from "./city/street-graph.ts";
import { signalAt } from "./city/traffic-signals.ts";
import { surfaceHeight } from "./city/terrain.ts";
import { DOCK } from "./harbor-layout.ts";
import { districtMotion } from "./district-motion.ts";

const roads = roadSurfaces(CITY_PLAN);
function onRoad(x:number,z:number) {
  return roads.some(({polygon}) => {
    let inside = false;
    for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
      const [a,b]=polygon[i]!, [c,d]=polygon[j]!;
      if ((b>z)!==(d>z) && x<(c-a)*(z-b)/(d-b)+a) inside=!inside;
    }
    return inside;
  });
}
const mod = (d:number,len:number) => (d%len+len)%len;

it("fits the longest vehicle within the paved road on every bend", () => {
  for (const route of vehicleRoutes) for (let d=0;d<route.length;d+=.23) {
    const {x,z,yaw}=route.at(d);
    for (const end of [-2.33,2.33]) for (const edge of [-.97,.97])
      expect(onRoad(x+end*Math.sin(yaw)+edge*Math.cos(yaw),z+end*Math.cos(yaw)-edge*Math.sin(yaw))).toBe(true);
  }
});

it("uses marked crossings to change sidewalks and lowers feet on both approaches", () => {
  for (const route of [cityWalk,neighborhoodWalk,promenadeRoute,plazaRoute]) {
    for (let d=0;d<route.length;d+=.25) {
      const {x,z}=route.at(d);
      if (onRoad(x,z)) expect(route.gates.some(g=>d>=g.start && d<=g.end)).toBe(true);
    }
    for (const g of route.gates) for (const u of [0,.5,1]) {
      const d=g.start+u*(g.end-g.start), {x,z}=route.at(d);
      expect(walkingHeight(route,d)-surfaceHeight(x,z)).toBeCloseTo(u===.5?.06:.16);
    }
  }
});

it("stops on an empty minor approach and then proceeds", () => {
  const base = SYNTHETIC_DAYS[0];
  const day = {...base,stepTotals:base.stepTotals.map(()=>0),calorieTotals:base.calorieTotals.map(()=>100)};
  const motion = districtMotion(day);
  let stopped = false;
  for (let t=0;t<day.durationSeconds-240 && !stopped;t+=30) {
    for (const [i,route] of motion.vehicleRoutes.entries()) {
      const d = motion.driveDistance(i,t);
      if (route.gates.some(g=>g.control==="stop" && g.stop && Math.abs(mod(d-g.start+1,route.length)-1)<.001)
        && motion.driveDistance(i,t+60)===d && motion.driveDistance(i,t+240)>d) stopped=true;
    }
  }
  expect(stopped).toBe(true);
});

it("stops on red, yields to a person on the zebra and restores the queue after a seek", () => {
  const day=SYNTHETIC_DAYS[0], motion=districtMotion(day);
  let red=false, yieldTime=0, heldSlot=0, walkerSlot=0;
  for (let t=0;t<day.durationSeconds-60 && !(red && yieldTime);t+=30) {
    for (const [i,r] of motion.vehicleRoutes.slice(0,trafficAt(day,t).vehicleCount).entries()) {
      const d=motion.driveDistance(i,t);
      for (const g of r.gates) {
        if (Math.abs(mod(d-g.start+1,r.length)-1)>.001 || motion.driveDistance(i,t+12)!==d) continue;
        if (g.control==="signal" && signalAt(g.entry,t).light==="red") red=true;
        for (const [j,w] of motion.walkers.slice(0,stepsAt(day,t).pedestrianCount).entries()) {
          const s=mod(motion.walkDistance(j,t),w.route.length);
          if (w.route.gates.some(c=>(c.crossing===g.entry || c.crossing===g.exit) && s>c.start+.5 && s<c.end-.5)) {
            yieldTime=t; heldSlot=i; walkerSlot=j;
          }
        }
      }
    }
  }
  expect(red).toBe(true); expect(yieldTime).toBeGreaterThan(0);
  motion.driveDistance(heldSlot,day.durationSeconds);
  const direct=districtMotion(day);
  expect(motion.driveDistance(heldSlot,yieldTime+.25)).toBe(direct.driveDistance(heldSlot,yieldTime+.25));
  expect(motion.walkDistance(walkerSlot,yieldTime+.25)).toBe(direct.walkDistance(walkerSlot,yieldTime+.25));
});

it("holds both turn lanes at the Market crossing until the pedestrian clears",()=>{
  const day=SYNTHETIC_DAYS[0], motion=districtMotion(day), noon=12*3600;
  const index=crossings.findIndex(c=>c.node==="market-end" && c.edge==="central-market/market-end");
  expect(trafficAt(day,noon).vehicleCount).toBeGreaterThanOrEqual(2);
  expect(motion.walkers.slice(0,stepsAt(day,noon).pedestrianCount).some((w,i)=>{
    const d=mod(motion.walkDistance(i,noon),w.route.length);
    return w.route.gates.some(g=>g.crossing===index && d>g.start+3 && d<g.end-3);
  })).toBe(true);
  for (const [i,route] of motion.vehicleRoutes.slice(0,2).entries()) {
    const gate=route.gates.find(g=>g.entry===index)!;
    const d=motion.driveDistance(i,noon);
    expect(mod(d,route.length)).toBeCloseTo(gate.start);
    expect(signalAt(index,noon).light).toBe("red");
    expect(motion.driveDistance(i,noon+60)).toBe(d);
    expect(motion.driveDistance(i,49200)).toBeGreaterThan(d);
  }
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
      const cars = motion.vehicleRoutes.slice(0, count).map((route, i) => route.at(motion.driveDistance(i, time)));
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

it("takes every vehicle inland and covers the arterials and local streets",()=>{
  expect(vehicleRoutes).toHaveLength(5);
  const used=new Set(vehicleRoutes.flatMap(r=>r.legs.map(l=>l.edge)));
  for (const edge of CITY_PLAN.edges.filter(e=>e.cls==="arterial" || e.cls==="boulevard")) expect(used.has(edge.id)).toBe(true);
  const local=CITY_PLAN.edges.filter(e=>e.cls==="local");
  expect(local.filter(e=>used.has(e.id)).length).toBeGreaterThanOrEqual(local.length/2);
  for (const day of SYNTHETIC_DAYS) {
    const routes=districtMotion(day).vehicleRoutes;
    expect(routes[0]!.legs.some(l=>l.edge==="ridge-harbor/ridge-market")).toBe(true);
    for (const route of routes) expect(route.legs.some(l=>l.points.some(([x])=>x < -95))).toBe(true);
  }
});

it("connects the working pier, mountain foot, and both residential districts for the first walker every day",()=>{
  for(const day of SYNTHETIC_DAYS){
    const motion=districtMotion(day), route=motion.walkers[0]!.route;
    for(const [x,z] of [[DOCK.x,DOCK.z+3.6],[-222,69],[-222,7],[-152,-58]] satisfies Point[]){
      const p=route.at(route.nearest(x,z));
      expect(Math.hypot(p.x-x,p.z-z)).toBeLessThan(6);
      if (x!==DOCK.x) {
        const distance=route.nearest(x,z);
        expect(distance).toBeGreaterThan(motion.walkDistance(0,0));
        expect(distance).toBeLessThan(motion.walkDistance(0,day.durationSeconds));
      }
    }
  }
});

it("admits pedestrians to a signalized crossing only on its walk phase",()=>{
  const day=SYNTHETIC_DAYS[0], motion=districtMotion(day);
  let admissions=0;
  for(let t=0;t<day.durationSeconds-6;t+=6) {
    if((t+6)%300===0)continue;
    for (const [i,w] of motion.walkers.slice(0,stepsAt(day,t).pedestrianCount).entries()) {
      const before=motion.walkDistance(i,t),after=motion.walkDistance(i,t+6);
      for(const g of w.route.gates) {
        const start=g.start+Math.round((before-g.start)/w.route.length)*w.route.length;
        if(before>start+.0001 || after<=start+.0001)continue;
        if(CITY_PLAN.nodes.find(n=>n.id===crossings[g.crossing]!.node)!.control!=="signal")continue;
        expect(signalAt(g.crossing,t).walk).toBe(true);admissions++;
      }
    }
  }
  expect(admissions).toBeGreaterThan(0);
});
