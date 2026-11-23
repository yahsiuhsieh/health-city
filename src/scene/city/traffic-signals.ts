import { sections,type Point } from "./street-graph.ts";
import { CITY_PLAN } from "./city-plan.data.ts";
import { trafficApproaches, junctions, minorApproach } from "./routes.ts";

export const signalApproaches = trafficApproaches.map(c => {
  const node = CITY_PLAN.nodes.find(n => n.id === c.node)!;
  const [a,b] = c.path;
  const x = (a![0]+b![0])/2, z = (a![1]+b![1])/2;
  const dx = a![1]-b![1], dz = b![0]-a![0], len = Math.hypot(dx,dz);
  const controller = CITY_PLAN.nodes.find(n=>n.id===junctions.get(node.id))!;
  const edge=CITY_PLAN.edges.find(e=>e.id===c.edge)!;
  const curb=sections[edge.cls].road/2+.55;
  const post:Point=[x+(dz*curb+dx*2.5)/len,z+(-dx*curb+dz*2.5)/len];
  return {post,node:controller, offset:CITY_PLAN.nodes.indexOf(controller)*126, x, z, dx:dx/len, dz:dz/len, horizontal:Math.abs(dx)>Math.abs(dz),
    hasStop: node.control==="stop" && minorApproach(node.id,c.edge)};
});

// Both approach groups share an exclusive pedestrian phase and clearance intervals.
export function signalAt(index: number, seconds: number) {
  const approach = signalApproaches[index]!;
  const time = (seconds + approach.offset) % 16800;
  const start = approach.horizontal ? 0 : 3840;
  const elapsed = time-start;
  const light = elapsed>=0 && elapsed<3192 ? "green" : elapsed>=3192 && elapsed<3588 ? "amber" : "red";
  return { light, walk:time>=7800 && time<9480 };
}
