import {CatmullRomCurve3,Vector3} from "three";
import {CITY_PLAN,towerSites} from "./city-plan.data.ts";
import {sidewalks,type Point} from "./street-graph.ts";
import {gardens,courts,gardenYaw,openSpaceVariant} from "./open-space-designs.ts";
import {smoothWalk} from "./walkway-shape.ts";
import {surfaceHeight} from "./terrain.ts";
import type {Placement} from "./building-assembler.ts";

const footways=sidewalks(CITY_PLAN).map(side=>side.outside);
export function closestWalk(point:Point,lines:Point[][]){
  let distance=Infinity,nearest=point;
  let tangent:Point=[1,0];
  for(const line of lines)for(let i=1;i<line.length;i++){
    const [x,z]=line[i-1]!,[bx,bz]=line[i]!,dx=bx-x,dz=bz-z;
    const t=Math.max(0,Math.min(1,((point[0]-x)*dx+(point[1]-z)*dz)/(dx*dx+dz*dz||1)));
    const px=x+dx*t,pz=z+dz*t,d=Math.hypot(px-point[0],pz-point[1]);
    if(d<distance){distance=d;nearest=[px,pz];const len=Math.hypot(dx,dz)||1;tangent=[dx/len,dz/len];}
  }
  return {nearest,distance,tangent};
}

// Each walk connects the footways on opposite edges of one city block.
function gardenWalk(points:Point[]){
  const controls=[closestWalk(points[0]!,footways).nearest,...points.slice(1,-1),closestWalk(points.at(-1)!,footways).nearest];
  const curve=new CatmullRomCurve3(controls.map(([x,z])=>new Vector3(x,0,z)));
  return curve.getSpacedPoints(Math.ceil(curve.getLength()/1.5)).map((v):Point=>[v.x,v.z]);
}
const courtyardWalk=gardenWalk([[-86,-80],[-75,-80],[-64,-77],[-56,-79],[-45,-80],[-44,-68],[-38,-60],[-28,-58]]);
const southShoreWalk=gardenWalk([[-91,-103],[-76,-104],[-56,-102.6],[-39,-105.4],[-25,-105.2],[-23.3,-101],[-22.1,-85],[-21.9,-65],[-25,-57],[-29,-53]]);
const northShoreWalk=gardenWalk([[-111,68],[-104,76],[-97,81],[-85,81.6],[-76,80],[-73,74],[-72,66]]);
export const gardenWalks=[
  gardenWalk([[-203,-18],[-198,-16],[-178,-13],[-156,-16],[-134,-13],[-116,-12],[-108,-16]]),
  gardenWalk([[-206,-75],[-197,-78],[-186,-79],[-174,-76],[-163,-75]]),
  southShoreWalk,
  northShoreWalk,
  gardenWalk([[-150,-77],[-141,-78],[-128,-82],[-115,-80],[-108,-78]]),
];

export function openSpaceEntries(count:number|null){
  if(count===null)return [];
  return towerSites.slice(count).flatMap(site=>{
    const form=site.interimForm;
    if(form!=="park" && form!=="plaza")return [];
    const layout=(form==="park"?gardens:courts)[openSpaceVariant(form,site.id)]!;
    const yaw=gardenYaw(site.id,site.yaw);
    const world=([u,v]:Point):Point=>[site.x+u*Math.cos(yaw)+v*Math.sin(yaw),site.z-u*Math.sin(yaw)+v*Math.cos(yaw)];
    const entry=world(layout.path.at(-1)!);
    const routes=site.z>70 && site.id!==7?[northShoreWalk]:[22,27,29].includes(site.id)?[southShoreWalk]:footways;
    const {nearest,tangent}=closestWalk(entry,routes);
    const sign=(entry[0]-nearest[0])*(-tangent[1])+(entry[1]-nearest[1])*tangent[0]>=0?1:-1;
    const normal:Point=[-tangent[1]*sign,tangent[0]*sign];
    const station=(d:number):Point=>[nearest[0]+d*normal[0],nearest[1]+d*normal[1]];
    const receivingWidth=routes===footways?0:1;
    const controls=form==="plaza"?[world(layout.path[0]!)]:layout.path.slice(0,-1).map(world);
    // Start plaza walks inside the terrace, then trim both sides to its exact perimeter.
    if(form==="plaza")controls.unshift([site.x,site.z]);
    const approach=station(receivingWidth+1.8);
    if(Math.hypot(controls.at(-1)![0]-approach[0],controls.at(-1)![1]-approach[1])<1)controls.pop();
    controls.push(approach,station(receivingWidth+.8),station(receivingWidth-1));
    const path=smoothWalk(controls,false,controls.length*10);
    const halfWidth=form==="park"?.82:1.18;
    const outline=form==="plaza"?(layout.curved?smoothWalk(layout.outline,true):layout.outline).map(world):[];
    const seat=layout.benches.find((_,i)=>layout.endBench!==undefined && i!==layout.endBench);
    const sideSeat=seat?world([seat[0],seat[1]]):undefined;
    return [{path,halfWidth,outline,site,nearest,normal,receivingWidth,sideSeat}];
  });
}

export function towerGardens(occupiedCount:number|null){
  const items:Placement[]=[],paths:Point[][]=[];
  function place(module:string,x:number,z:number,size:number,yaw:number,color="#ffffff"){
    items.push({module,at:[x,surfaceHeight(x,z)+.02,z],size:[size,size,size],yaw,color});
  }
  for(const line of gardenWalks){
    for(let i=1;i<line.length-1;i++){
      const a=line[i]!,b=line[i+1]!,dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
      const x=a[0]-dz/len*1.8,z=a[1]+dx/len*1.8;
      if(towerSites.some(s=>Math.abs(s.x-x)<s.width/2+1.5 && Math.abs(s.z-z)<s.depth/2+1.5))continue;
      place("bench",x,z,.94,Math.atan2(-dz,dx)+Math.PI);break;
    }
  }
  const routes=[...footways,...gardenWalks,courtyardWalk];
  const walks=[...gardenWalks];
  for(const {x,z,yaw} of towerSites.slice(0,occupiedCount??0)){
    const fx=Math.sin(yaw),fz=Math.cos(yaw);
    // Start under the entrance threshold so different podium shapes meet the path.
    const start:Point=[x+fx*3,z+fz*3];
    const destinations=routes.map(line=>({...closestWalk(start,[line]),line})).filter(({nearest:[px,pz]})=>(px-start[0])*fx+(pz-start[1])*fz>.1);
    destinations.sort((a,b)=>a.distance-b.distance);
    const access=destinations[0];
    if(access){
      const [x,z]=access.nearest;
      // Cross the sidewalk boundary for trimming. At a garden walk, stop on its centerline.
      const extra=footways.includes(access.line) && access.distance>0?2/access.distance:0;
      paths.push([start,[x+(x-start[0])*extra,z+(z-start[1])*extra]]);
      if(access.line===courtyardWalk && !walks.includes(courtyardWalk))walks.push(courtyardWalk);
    }
  }
  return {items,paths,walks};
}
