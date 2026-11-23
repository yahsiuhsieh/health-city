import {assignInterimForms} from "./interim-layout.ts";
import {DISTRICT_SEED,plotTowerHeight} from "../tower-designs.ts";
import {edgeCenterline,sections} from "./street-graph.ts";
import type { Point, StreetClass, StreetEdge, StreetGraph, StreetNode } from "./street-graph.ts";

const nodes:StreetNode[]=[];
function node(id:string,x:number,z:number,control:StreetNode["control"]="stop", unmarked?:string[]){
  nodes.push({id,x,z,control,unmarked});
}
node("ridge-south",-220,-111.5,"none");
node("ridge-harbor",-218,-47,"signal",["ridge-market"]);
node("ridge-market",-211,18,"signal",["ridge-north"]);
node("ridge-north",-220,67.1,"none");
node("valley",-153,66,"none");
node("central-south",-96.4,-112.2,"none");
node("central-harbor",-97,-47,"signal");
node("central-market",-97,18,"signal",["central-diagonal"]);
node("central-diagonal",-97,53,"signal",["valley"]);
node("freight",-16.1,-47,"none");
node("gate",-27,-47,"signal",["freight"]);
node("market-end",-27,18,"signal");

node("garden",-157,-109,"stop",["ridge-south","central-south"]);
node("orchard",-157,-47,"stop",["central-harbor"]);
// The three perimeter elbows are bends in a continuous road.
for(const n of nodes)if(["ridge-south","ridge-north","central-south"].includes(n.id))n.bendSetback=18;
const edges:StreetEdge[]=[];
function street(name:string,cls:StreetClass,from:string,to:string,bend?:Point[]){
  edges.push({id:from+"/"+to,name,cls,from,to,bend});
}
function avenue(name:string,ids:string[]){
  for(let i=1;i<ids.length;i++)street(name,"arterial",ids[i-1]!,ids[i]!);
}
street("Ridge Road","arterial","ridge-south","ridge-harbor");
street("Ridge Road","arterial","ridge-harbor","ridge-market",[[-214,-12]]);
street("Ridge Road","arterial","ridge-market","ridge-north");
avenue("Market Avenue",["ridge-market","central-market","market-end"]);
avenue("Harbor Avenue",["ridge-harbor","orchard","central-harbor","gate"]);
avenue("Central Avenue",["central-south","central-harbor","central-market","central-diagonal"]);
street("Civic Diagonal","arterial","market-end","central-diagonal",[[-27,36],[-29,47],[-34,54],[-43,56],[-62,55]]);
street("Civic Diagonal","arterial","central-diagonal","valley",[[-130,63],[-143,65.9]]);
street("Waterfront Boulevard","boulevard","gate","market-end",[[-27,-9]]);
street("Quay Road","quay","gate","freight");
street("Garden Street","local","ridge-south","garden");
street("Garden Street","local","garden","central-south");
street("Orchard Lane","local","garden","orchard");
street("Valley Lane","local","ridge-north","valley");

export const CITY_PLAN:StreetGraph={nodes,edges};
function rectangle(x:number,z:number,w:number,d:number):Point[]{
  return [[x,z],[x+w,z],[x+w,z+d],[x,z+d]];
}
export const reservoirSite=rectangle(-207,74,45,35);
export const exerciseGardenSite=rectangle(-160,74,50,40);
export const civicPlaza:Point[]=[[-83,29.3],[-57,29.3],[-62,32],[-83,35.2]];

// The first five sites span the waterfront, the core and the ridge approach.
const sites:Point[]=[
  [-55,-18],[-192,48],[-131,-4],[-75,-70],[-152,40],
  [-75,-18],[-171,-4],[-59,80],[-139,-69],[-99,97],
  [-191,-4],[-119,-69],[-79,94],[-54,-69],[-172,48],
  [-151,-4],[-193,-24],[-173,-24],[-153,-24],[-133,-24],
  [-196,-69],[-176,-69],[-34,-73],[-196,-89],[-176,-89],
  [-139,-89],[-119,-89],[-55,-89],[-75,-90],[-35,-93],
];
const frontages=edges.filter(e=>e.cls!=="alley").flatMap(e=>{
  const line=edgeCenterline(CITY_PLAN,e);
  return line.slice(1).map((end,i)=>({start:line[i]!,end,roadRadius:sections[e.cls].road/2}));
});
const parcels=sites.map(([x,z],id)=>{
  let nearest=Infinity,yaw=0;
  for(const {start,end} of frontages){
    const dx=end[0]-start[0],dz=end[1]-start[1];
    const u=Math.max(0,Math.min(1,((x-start[0])*dx+(z-start[1])*dz)/(dx*dx+dz*dz)));
    const ox=start[0]+u*dx-x,oz=start[1]+u*dz-z,distance=Math.hypot(ox,oz);
    if(distance<nearest){
      nearest=distance;
      yaw=Math.round(Math.atan2(ox,oz)/(Math.PI/2))*Math.PI/2;
    }
  }
  // The interior parcel opens onto the shared courtyard between the two rows.
  if(id===27)yaw=0;
  return {id,x,z,width:20,depth:20,yaw,height:plotTowerHeight(x,z)};
});
const interim=assignInterimForms(parcels,CITY_PLAN,DISTRICT_SEED);
export const towerSites=parcels.map((site,i)=>({...site,...interim[i]!}));
export function permitsStreetTree(x:number,z:number,radius:number){
  if(x+radius>=-17 && z>=-60 && z<=52)return false;
  for(const {start:[ax,az],end:[bx,bz],roadRadius} of frontages){
    const dx=bx-ax,dz=bz-az;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
    if(Math.hypot(x-ax-t*dx,z-az-t*dz)<roadRadius+.45)return false;
  }
  return towerSites.every(plot=>Math.hypot(Math.max(0,Math.abs(plot.x-x)-plot.width/2),
    Math.max(0,Math.abs(plot.z-z)-plot.depth/2))>=radius);
}
