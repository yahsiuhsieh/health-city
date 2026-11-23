import {port} from "../port-layout.ts";
import {laneCenterlines} from "./street-graph.ts";
import type {StreetGraph,StreetNode,StreetEdge,StreetClass,Point} from "./street-graph.ts";

const nodes:StreetNode[]=[],edges:StreetEdge[]=[];
const xs=[-90,-82,-20,-10],zs=[-47,-39,18,42];
for(const [ix,x] of xs.entries())for(const [iz,z] of zs.entries()){
  nodes.push({id:ix+"-"+iz,x,z,control:ix===2&&iz===2?"signal":"none"});
}
function edge(ax:number,az:number,bx:number,bz:number,cls:StreetClass){
  const from=ax+"-"+az,to=bx+"-"+bz;edges.push({id:from+"/"+to,from,to,cls});
}
// The two streets frame one downtown block. The promenade stops at the quay.
for(const iz of [1,2])for(let ix=0;ix<2;ix++)edge(ix,iz,ix+1,iz,iz===2?"arterial":"local");
for(const ix of [1,2])for(let iz=0;iz<3;iz++)edge(ix,iz,ix,iz+1,ix===2?"arterial":"local");
export const sliceGraph:StreetGraph={nodes,edges};
const marketApproach="1-2/2-2";
const lanes=laneCenterlines(sliceGraph);
export const marketTurnLanes=lanes.filter(lane=>lane.edge===marketApproach && lane.to==="2-2");
export const marketRightLane=marketTurnLanes.find(lane=>lane.lane===1)!;
export const southboundRightLane=lanes.find(lane=>lane.edge==="2-2/2-3" && lane.from==="2-2" && lane.lane===1)!;
export const sliceOutline:Point[]=[[-91,-47],[-4,-47],[-4,42],[-91,42]];
// Leave the original basin, freight apron, and public piers in world coordinates.
export const blockOffsetX = -20;
export const sliceBerth = {x: port.boatX, z: port.boatZ, yaw: 0};
export const samplePlot={ordinal:8,x:-62,z:-21,width:22,depth:20,height:64.6};
