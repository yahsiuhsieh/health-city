import { DOCK, PAVING_Y } from "../harbor-layout.ts";
import { polylineRoute } from "../loop-path.ts";
import { CITY_PLAN, civicPlaza } from "./city-plan.data.ts";
import { junctionApproaches, laneCenterlines, sections, signalJunctions, trimmedLane, turnConnectors, walkNetwork } from "./street-graph.ts";
import type { Point } from "./street-graph.ts";
import { surfaceHeight } from "./terrain.ts";

const lanes = laneCenterlines(CITY_PLAN);
const turns = CITY_PLAN.nodes.flatMap(n => turnConnectors(CITY_PLAN, n.id, lanes));
export const junctions = signalJunctions(CITY_PLAN);
const network = walkNetwork(CITY_PLAN);
export const crossings = network.crossings;
// Pedestrian gate indices refer only to marked crossings. Vehicles also use unmarked approaches.
export const trafficApproaches = [...crossings, ...junctionApproaches(CITY_PLAN).filter(a=>!a.marked)];
const distance = (a: Point, b: Point) => Math.hypot(a[0]-b[0], a[1]-b[1]);

export function crossingAt(node: string, edge: string) {
  return crossings.find(c => c.node === node && c.edge === edge)!;
}
export function minorApproach(node: string, edge: string) {
  const rank = (cls: string) => cls === "alley" ? 0 : cls === "local" || cls === "quay" ? 1 : 2;
  const arms = CITY_PLAN.edges.filter(e => e.from === node || e.to === node);
  const incoming = arms.find(e => e.id === edge)!;
  const highest = Math.max(...arms.map(e => rank(e.cls)));
  return highest === 1 || rank(incoming.cls) < highest;
}

export function vehicleLoop(nodeIds: string[], preferredLane = 0) {
  const legs = nodeIds.map((from,i) => {
    const to = nodeIds[(i+1)%nodeIds.length];
    const available = lanes.filter(l => l.from === from && l.to === to);
    if (!available.length) throw Error("Missing lane from " + from + " to " + to);
    return available[Math.min(preferredLane, available.length-1)]!;
  });
  const route = polylineRoute(legs.flatMap((leg,i) => {
    const next = legs[(i+1)%legs.length]!;
    const turn = turns.find(t => t.from === leg && t.to === next)!;
    return [...trimmedLane(leg), ...turn.points];
  }));
  const gates = legs.flatMap((leg,i) => {
    const group = junctions.get(leg.to)!;
    if (group === junctions.get(leg.from)) return [];
    const node = CITY_PLAN.nodes.find(n => n.id === group)!;
    let end = (i+1)%legs.length;
    while (junctions.get(legs[end]!.to)===group) end=(end+1)%legs.length;
    const next=legs[end]!;
    function boundary(atNode: string, edge: string, fallback: Point, before: boolean) {
      const index = trafficApproaches.findIndex(c => c.node === atNode && c.edge === edge);
      const path = trafficApproaches[index]?.path;
      const point: Point = path ? [(path[0]![0]+path[1]![0])/2,(path[0]![1]+path[1]![1])/2] : fallback;
      const at = route.nearest(...point);
      return { index, at: at + (before ? -1 : 1) * (path ? 5 : 2.6) };
    }
    const entry = boundary(leg.to,leg.edge, trimmedLane(leg).at(-1)!, true);
    const exit = boundary(next.from,next.edge, trimmedLane(next)[0]!, false);
    const angle=route.at(exit.at).yaw-route.at(entry.at).yaw;
    return { node:node.id, control:node.control, lane:leg.lane, turn:Math.atan2(Math.sin(angle),Math.cos(angle)), stop:node.control==="stop" && minorApproach(leg.to,leg.edge),
      entry:entry.index, exit:exit.index, start:entry.at, span:(exit.at-entry.at+route.length)%route.length };
  });
  return {...route, legs, gates};
}

export const vehicleRoutes = [
  vehicleLoop(["ridge-market","central-market","market-end","gate","central-harbor","orchard","ridge-harbor"]),
  vehicleLoop(["central-harbor","central-market","market-end","central-diagonal","valley","ridge-north","ridge-market","ridge-harbor","orchard"],1),
  vehicleLoop(["central-harbor","central-south","garden","orchard"]),
  vehicleLoop(["ridge-market","central-market","central-diagonal","market-end","gate","central-harbor","orchard","ridge-harbor"]),
  vehicleLoop(["ridge-south","garden","central-south","central-harbor","central-market","ridge-market","ridge-harbor"],1),
];

// Link the named destinations to their own pavement, including the existing dock deck.
type Link = { to: Point; crossing: number };
const key = (p: Point) => p[0].toFixed(4) + "/" + p[1].toFixed(4);
const links = new Map<string,Link[]>();
function connect(a: Point, b: Point, crossing = -1) {
  if (key(a) === key(b)) return;
  for (const [from,to] of [[a,b],[b,a]] as const) {
    const id = key(from);
    if (!links.has(id)) links.set(id,[]);
    links.get(id)!.push({to,crossing});
  }
}
function attach(edge: string, side: number, target: Point) {
  const path = network.paths.find(p => p.edge === edge && p.side === side)!.points;
  let best = Infinity, segment = 0, nearest: Point = path[0]!;
  for (let i=1; i<path.length; i++) {
    const a = path[i-1]!, b = path[i]!, dx = b[0]-a[0], dz = b[1]-a[1];
    const t = Math.max(0, Math.min(1, ((target[0]-a[0])*dx+(target[1]-a[1])*dz)/(dx*dx+dz*dz || 1)));
    const p: Point = [a[0]+t*dx,a[1]+t*dz], error = distance(p,target);
    if (error<best) { best=error; segment=i; nearest=p; }
  }
  path.splice(segment,0,nearest);
  connect(nearest,target);
}
const pier: Point = [DOCK.x, DOCK.z+3.6];
const quay: Point = [-12.5,pier[1]];
attach("gate/market-end",-1,quay);
connect(quay,pier);
const plazaWest: Point = [civicPlaza[0]![0]+2,civicPlaza[0]![1]+.5];
const plazaEast: Point = [civicPlaza[1]![0]-4,civicPlaza[1]![1]+.5];
attach("central-market/market-end",1,plazaWest);
attach("central-market/market-end",1,plazaEast);
connect(plazaWest,plazaEast);
const promenade: Point = [2.8,43.5];
attach("market-end/central-diagonal",-1,[-12.5,promenade[1]]);
connect([-12.5,promenade[1]],promenade);
for (const path of network.paths)
  for (let i=1;i<path.points.length;i++) connect(path.points[i-1]!,path.points[i]!);
crossings.forEach((c,i) => connect(c.path[0]!,c.path[1]!,i));

const landmarks = {
  pier, plazaWest, plazaEast,
  promenade,
  marketEndSouth: crossingAt("market-end","central-market/market-end").path[0]!,
  marketEndNorth: crossingAt("market-end","central-market/market-end").path[1]!,
  market: crossingAt("central-market","central-market/market-end").path[0]!,
  marketSouth: crossingAt("central-market","central-market/market-end").path[1]!,
  north: network.paths.find(p => p.edge==="ridge-north/valley" && p.side===1)!.points[0]!,
  south: crossingAt("orchard","garden/orchard").path[0]!,
  ridge: crossingAt("ridge-market","ridge-harbor/ridge-market").path[1]!,
};
function shortestWalk(from: Point, to: Point) {
  const pending = new Map([[key(from),from]]);
  const costs = new Map([[key(from),0]]);
  const previous = new Map<string,{point:Point; crossing:number}>();
  while (pending.size) {
    let id = "", best = Infinity;
    for (const candidate of pending.keys()) {
      const cost = costs.get(candidate)!;
      if (cost<best) { id=candidate; best=cost; }
    }
    if (id===key(to)) break;
    const p = pending.get(id)!;
    pending.delete(id);
    for (const link of links.get(id)!) {
      const next = key(link.to), cost = best + distance(p,link.to);
      if (cost >= (costs.get(next) ?? Infinity)) continue;
      costs.set(next,cost); pending.set(next,link.to);
      previous.set(next,{point:p,crossing:link.crossing});
    }
  }
  const result: Link[] = [];
  for (let p=to; key(p)!==key(from);) {
    const prev = previous.get(key(p));
    if (!prev) throw Error("Disconnected sidewalk at " + key(p));
    result.push({to:p,crossing:prev.crossing}); p=prev.point;
  }
  return result.reverse();
}
export function walkLoop(stops: (keyof typeof landmarks)[]) {
  const start = landmarks[stops[0]!];
  const points = [start];
  const gates: { crossing:number; start:number; end:number }[] = [];
  let length = 0;
  for (let i=0;i<stops.length;i++) {
    for (const link of shortestWalk(landmarks[stops[i]!],landmarks[stops[(i+1)%stops.length]!])) {
      const end = length + distance(points.at(-1)!,link.to);
      if (link.crossing>=0) gates.push({crossing:link.crossing,start:length,end});
      points.push(link.to); length=end;
    }
  }
  return {...polylineRoute(points),gates};
}
export const cityWalk = walkLoop(["pier","market","north","ridge","south","marketSouth"]);
export const neighborhoodWalk = walkLoop(["market","north","south","marketSouth"]);
export const promenadeRoute = walkLoop(["pier","promenade","marketEndNorth","marketEndSouth"]);
export const plazaRoute = walkLoop(["plazaWest","plazaEast","marketSouth","market"]);

export function walkingHeight(route: typeof cityWalk, d: number) {
  const {x,z} = route.at(d);
  if (z>10 && x > -14.4) return PAVING_Y;
  if (x >= DOCK.x-DOCK.halfWidth) return DOCK.deck;
  if (x > quay[0]) return Math.min(PAVING_Y, DOCK.deck + (DOCK.x-DOCK.halfWidth-x)*.18);
  const s = ((d%route.length)+route.length)%route.length;
  const gate = route.gates.find(g => s>=g.start && s<=g.end);
  let offset = .16;
  if (gate) {
    const edge = CITY_PLAN.edges.find(e => e.id===crossings[gate.crossing]!.edge)!;
    const section = sections[edge.cls], setback = (section.width-section.road)/4;
    const fromWalk = Math.min(s-gate.start,gate.end-s);
    offset = .06+.1*Math.max(0,1-fromWalk/setback);
  }
  if (x > -14.4) return PAVING_Y;
  return surfaceHeight(x,z)+offset;
}
