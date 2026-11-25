import {breakwaterArms,workingQuay} from "./city/harbor-plan.ts";
import {surfaceHeight} from "./city/terrain.ts";
import { WATER_LEVEL } from "./ocean/layers.ts";
import { port } from "./port-layout.ts";
import type { Point } from "./loop-path.ts";

export type ShoreType="quay"|"seawall"|"revetment"|"beach";
export interface CoastSegment {type:ShoreType;points:Point[]}
export const harborEdge:Point[]=[
  [-11,-55],[-3.425,-51],[-3.425,-25],[port.quayEdge,port.southEnd],
  [port.quayEdge,port.northEnd],[-12.8,port.northEnd],[-12.8,5.85],[-4,10],[-4,46],[-10,51],
];
// The detached harbor works are open shore segments outside the mainland polygon.
export const harborWorks: CoastSegment[] = [
  ...breakwaterArms.map(points => ({type:"revetment" as const,points:[...points]})),
  {type:"quay",points:[[workingQuay.start,workingQuay.edge],[workingQuay.end,workingQuay.edge]]},
];
export const coastSegments:CoastSegment[]=[
  {type:"quay",points:harborEdge.slice(0,8)},
  {type:"seawall",points:[...harborEdge.slice(7),[-12,65],[-22,78]]},
  {type:"beach",points:[[-22,78],[-31,82],[-42,85],[-49,91],[-62,103],[-87,107],[-104,111],[-121,118]]},
  {type:"revetment",points:[
    [-121,118],[-135,130],[-144,151],[-151,166],[-168,174],[-193,173],[-219,173],
    [-242,169],[-262,158],[-280,140],[-288,124],[-287,109],[-275,96],[-269,89],
    [-265,83],[-262,76],[-260.5,69],[-260,60],[-261,22],[-262,-20],[-258,-74],
    [-247,-82],[-217,-119],[-173,-120],[-132,-120],[-94,-120],
  ]},
  {type:"beach",points:[[-94,-120],[-77,-111],[-63,-115],[-49,-114],[-23,-106]]},
  {type:"revetment",points:[[-23,-106],[-17,-84],[-13,-68],harborEdge[0]!]},
];
const samples=coastSegments.flatMap(segment=>segment.points.slice(0,-1).flatMap(([x,z],i)=>{
  const [nx,nz]=segment.points[i+1]!,steps=Math.ceil(Math.hypot(nx-x,nz-z)/2.5);
  return Array.from({length:steps},(_,j)=>({x:x+(nx-x)*j/steps,z:z+(nz-z)*j/steps,type:segment.type}));
}));
export const coast=samples.map(({x,z,type},i)=>{
  const prev=samples[(i+samples.length-1)%samples.length]!,next=samples[(i+1)%samples.length]!;
  const dx=next.x-prev.x,dz=next.z-prev.z,len=Math.hypot(dx,dz);
  const offshore=(d:number):Point=>[x+dz/len*d,z-dx/len*d];
  const width=type==="beach"?3+.55*Math.sin(x*.17):type==="revetment"?(surfaceHeight(x,z)+.025)*1.5:0;
  return {type,crest:[x,z] as Point,beach:offshore(width*.55),waterline:offshore(width),
    toe:offshore(width+(type==="revetment"?6:width*.8)),width,shelf:type==="beach"?14:5};
});

export const coastGroundOffset=-.03;

// Each station defines one cross-section shared by both adjoining shore panels.
const sections=coast.map((station,i)=>{
  const previous=coast[(i+coast.length-1)%coast.length]!;
  const height=surfaceHeight(...station.crest);
  const middle=(type:ShoreType)=>type==="revetment"?height*.45:.22;
  const at=([x,z]:Point,y:number):[number,number,number]=>[x,y,z];
  const swash:Point=station.type==="beach" && previous.type==="beach"
    ? [(station.waterline[0]-station.crest[0])/station.width,(station.waterline[1]-station.crest[1])/station.width]
    : [0,0];
  return {
    crest:at(station.crest,height+coastGroundOffset),
    beach:at(station.beach,(middle(previous.type)+middle(station.type))/2),
    waterline:at(station.waterline,WATER_LEVEL),
    toe:at(station.toe,WATER_LEVEL-6),
    swash,
  };
});
export const shorePanels=sections.map((start,i)=>({start,end:sections[(i+1)%sections.length]!}));
