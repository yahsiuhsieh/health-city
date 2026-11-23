import {Suspense,useEffect,useMemo,type RefObject} from "react";
import {BufferGeometry,CatmullRomCurve3,Color,DoubleSide,Float32BufferAttribute,ShapeUtils,Vector2,Vector3} from "three";
import type {Plane} from "three";
import {coast,coastGroundOffset,shorePanels} from "../coastline.ts";
import {DRY_LAYER,WATER_LEVEL} from "../ocean/layers.ts";
import {useOcean} from "../ocean/OceanEnvironment.tsx";
import {patchSand} from "../ocean/sand-material.ts";
import {CITY_PLAN,towerSites,permitsStreetTree,civicPlaza,exerciseGardenSite,reservoirSite} from "./city-plan.data.ts";
import {bendEdgeMarking,bendRun,taperLength,blocks,junctionApproaches,edgeCenterline,offsetLine,roadSurfaces,sections,sidewalks,signalJunctions,throughNeighbor} from "./street-graph.ts";
import type {Point} from "./street-graph.ts";
import {laneArrows} from "./lane-arrows.ts";
import {footwayClipper} from "./pavement.ts";
import {gardenPavement,pavementLayer} from "./walkway-paving.ts";
import {ribbon,walkGrade} from "./walkway-shape.ts";
import {surfaceHeight} from "./terrain.ts";
import {palette as p} from "./palette.ts";
import {BackgroundBuildings} from "./BackgroundBuildings.tsx";
import {clearsFrontage,frontage,type Building,type Placement} from "./building-assembler.ts";

import {assembleInterim} from "./interim-buildings.ts";
import {signalApproaches} from "./traffic-signals.ts";
import {closestWalk,gardenWalks,openSpaceEntries} from "./tower-gardens.ts";
import {CityStreetLamps,type LampSite} from "./CityStreetLamps.tsx";

const infillLots=[
  [-91,72,14,11,2],[-129,42,14,11,0],[-47,38,11,10,0],
  [-115,40,9,8,0],[-115,-30,9,8,2],[-41,74,9,8,2],
] as const;
const marketBuildings:Building[]=[...frontage.slice(0,3).map(b=>({...b,x:b.x-13})),
  ...infillLots.map(([x,z,w,d,shopSide],i)=>{
    const style=Math.abs(x*31+z*7)%4,waterfront=x>-65,residential=z>62;
    const colors=residential?["#d9b8a0","#c98e72","#e3d3b8","#b7c4b0"]:
      waterfront?["#e6d8bf","#d7b9a0","#c7d0c6","#e0c9a6"]:p.downtown;
    return {x,z,w,d,shopSide,style,floors:(residential?3:waterfront?4:6)+i%3,kitVariant:i,wallColor:colors[style]!};
  })];
  function clip(points:Point[],axis:0|1,value:number,above:boolean){
    const out:Point[]=[];
    for(const [i,a] of points.entries()){
      const b=points[(i+1)%points.length]!,ina=above?a[axis]>=value:a[axis]<=value,inb=above?b[axis]>=value:b[axis]<=value;
      if(ina)out.push(a);
      if(ina!==inb){const t=(value-a[axis])/(b[axis]-a[axis]);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
    }
    return out;
  }

function meshData(){
  const xyz:number[]=[],rgb:number[]=[];
  function triangle(a:number[],b:number[],c:number[],color:string){
    const tint=new Color(color);
    xyz.push(...a,...b,...c);
    for(let i=0;i<3;i++)rgb.push(tint.r,tint.g,tint.b);
  }
  function polygon(points:Point[],offset:number | ((p:Point)=>number),color:string){
    for(const [a,b,c] of ShapeUtils.triangulateShape(points.map(([x,z])=>new Vector2(x,z)),[])){
      let fragments=[[points[c!]!,points[b!]!,points[a!]!]];
      for(const boundary of [-205,-18,-14]){
        fragments=fragments.flatMap(poly=>poly.some(v=>v[0]<boundary)&&poly.some(v=>v[0]>boundary)
          ?[clip(poly,0,boundary,false),clip(poly,0,boundary,true)]:[poly]);
      }
      for(const poly of fragments){
        const v=poly.map(([x,z])=>[x,surfaceHeight(x,z)+(typeof offset==="number"?offset:offset([x,z])),z]);
        for(let i=2;i<v.length;i++)triangle(v[0]!,v[i-1]!,v[i]!,color);
      }
    }
  }
  function band(line:Point[],low:number,high:number,color:string,h:number){
    const a=offsetLine(line,low),b=offsetLine(line,high);
    for(let i=1;i<a.length;i++)polygon([a[i-1]!,a[i]!,b[i]!,b[i-1]!],h,color);
  }
  function wall(a:Point,b:Point,low:number,high:number,color:string){
    const at=([x,z]:Point,h:number)=>[x,surfaceHeight(x,z)+h,z];
    triangle(at(a,low),at(a,high),at(b,high),color);triangle(at(a,low),at(b,high),at(b,low),color);
  }
  function finish(){
    const geometry=new BufferGeometry();
    geometry.setAttribute("position",new Float32BufferAttribute(xyz,3));
    geometry.setAttribute("color",new Float32BufferAttribute(rgb,3));
    geometry.computeVertexNormals();xyz.length=0;rgb.length=0;return geometry;
  }
  return {polygon,triangle,band,wall,finish};
}

function buildGround(){
  const mesh=meshData(),furniture:Placement[]=[],lampSites:LampSite[]=[];
  const nextLampSide=new Map<string,number>();
  function place(module:string,x:number,z:number,size:Placement["size"],color:string,yaw=0,h=.16){
    furniture.push({module,at:[x,surfaceHeight(x,z)+h,z],size,yaw,color});
  }
  const tree=(x:number,z:number,scale=1)=>place("street-tree",x,z,[scale,scale,scale],"#ffffff",x*.63);
  const coastPoints=coast.map(c=>[...c.crest] as Point);
  mesh.polygon(coastPoints,coastGroundOffset,p.lawnShade);
  // Extend the grass under the pavement so the sidewalk defines its visible edge.
  for(const block of blocks(CITY_PLAN))mesh.polygon(block.streetBoundary,.01,p.courtyard);
  function meadowLoop(site:Point[],controls:Point[]):Point[]{
    const [x,z]=site[0]!,w=site[2]![0]-x,d=site[2]![1]-z;
    const curve=new CatmullRomCurve3(controls.map(([u,v])=>new Vector3(x+w*u,0,z+d*v)),true);
    return curve.getSpacedPoints(42).slice(0,-1).map(v=>[v.x,v.z]);
  }
  const meadow=meadowLoop(reservoirSite,[[.04,.30],[.20,.07],[.64,.09],[.93,.32],[.86,.67],[.61,.9],[.20,.90],[.05,.68]]);
  mesh.polygon(meadow,.08,p.planting);
  const garden=meadowLoop(exerciseGardenSite,[[.04,.25],[.26,.055],[.78,.09],[.96,.30],[.82,.65],[.56,.91],[.13,.86]]);
  mesh.polygon(garden,.08,p.lawn);
  mesh.polygon(civicPlaza,.18,p.plaza);
  for(const x of [-80,-75,-70])place("bench",x,30.95,[.82,.82,.82],"#ffffff",0,.19);
  for(const x of [-82,-77,-72,-67,-62])place("wall",x,29.64,[.18,.55,.18],"#53635a",0,.19);
  place("round-planter",-81.2,33.1,[.84,.84,.84],"#e3ded0",0,.19);
  place("shrub-a",-81.2,33.1,[.94,.82,.94],"#ffffff",0,.59);
  place("round-planter",-67.6,31.75,[.66,.72,.66],"#e3ded0",0,.19);
  place("shrub-b",-67.6,31.75,[.71,.64,.71],"#ffffff",0,.54);
  const gardenPath=garden.map(([x,z]):Point=>[-135+(x+135)*.86,94+(z-94)*.83]);

  const entry=gardenPath.reduce((a,b)=>a[1]<b[1]?a:b);

  for(const [i,[x,z]] of ([[-48,79],[-38,74],[-64,96],[-74,99],[-110,105]] as const).entries()){
    if(clearsFrontage(x,z,4,marketBuildings)&&permitsStreetTree(x,z,4))place("umbrella-pine-a",x,z,[.94,.94,.94],"#f8f8f0",i);
  }
  for(const [i,[x,z]] of meadow.entries())if(i%5===0)place(i%2?"shrub-a":"shrub-b",x,z,[1.2,1,1.25],"#ffffff",i);
  for(const i of [4,14,23,33])tree(...gardenPath[i]!,1.15);
  for(const [x,z] of [[-201,86],[-198,83],[-177,101],[-174,98]] as const)tree(x,z,1.2);
  mesh.band(meadow.slice(1,10),0,.5,p.seawall,.45);
  for(let i=2;i<10;i++)mesh.wall(meadow[i-1]!,meadow[i]!,.055,.45,p.seawall);

  const roads=roadSurfaces(CITY_PLAN);
  const approaches=junctionApproaches(CITY_PLAN);
  const crossings=approaches.filter(a=>a.marked);
  const ramps=crossings.flatMap(c=>{
    const section=sections[CITY_PLAN.edges.find(e=>e.id===c.edge)!.cls];
    const depth=(section.width-section.road)/4;
    return c.path.map((lip,i)=>{
      const other=c.path[1-i]!,dx=(lip[0]-other[0])/section.road,dz=(lip[1]-other[1])/section.road;
      const along=([x,z]:Point)=>(x-lip[0])*dx+(z-lip[1])*dz;
      const at=(d:number,w:number):Point=>[lip[0]+dx*d-dz*w,lip[1]+dz*d+dx*w];
      // Extend the opening slightly into the road to clear the curb on a bend.
      const polygon=[at(-.35,-1.48),at(depth,-1.48),at(depth,1.48),at(-.35,1.48)];
      return {polygon,height:(p:Point)=>.06+.1*Math.min(1,Math.max(0,along(p)/depth))};
    });
  });
  const pavement=footwayClipper(roads),footway=footwayClipper([...roads,...ramps]);
  const sides=sidewalks(CITY_PLAN);
  for(const side of sides){
    for(const patch of footway(side.polygon))mesh.polygon(patch,.16,p.sidewalk);
    for(const patch of footway(side.curb)){
      mesh.polygon(patch,.17,p.curb);
      // Only the exposed edge of a clipped curb has a vertical face.
      for(const [j,a] of patch.entries()){
        const b=patch[(j+1)%patch.length]!;
        for(let i=1;i<side.kerb.length;i++){
          const c=side.curb[i-1]!,d=side.curb[i]!,dx=d[0]-c[0],dz=d[1]-c[1],length=Math.hypot(dx,dz);
          if(length<.001)continue;
          const onLip=(p:Point)=>Math.abs(dx*(p[1]-c[1])-dz*(p[0]-c[0]))<.002*length
            && (p[0]-c[0])*dx+(p[1]-c[1])*dz>=-.002*length
            && (p[0]-d[0])*dx+(p[1]-d[1])*dz<=.002*length;
          if(onLip(a)&&onLip(b)){mesh.wall(a,b,.032,.17,p.curb);break;}
        }
      }
    }
  }
  for(const ramp of ramps)for(const patch of pavement(ramp.polygon))mesh.polygon(patch,ramp.height,p.sidewalk);
  for(const road of roads)mesh.polygon(road.polygon,.032,p.asphalt);
  // The service drive ends on the concrete apron at the two warehouse doors.
  mesh.polygon([[-18.3,-48.4],[-15.45,-48.4],[-15.45,-39.6],[-18.3,-39.6]],.038,p.quay);
  // Carry the warehouse-side walk down to the existing quay deck.
  mesh.polygon([[-16.1,-53],[-15.2,-53],[-13.95,-53.35],[-13.95,-49.9],[-16.1,-50.5]],
    ([x])=>.16+(.60-surfaceHeight(-13.95,-52)-.16)*Math.min(1,(x+16.1)/2.15),p.sidewalk);
  const stops=signalApproaches.filter(a=>a.hasStop).map(a=>a.post);
  const groups=signalJunctions(CITY_PLAN);
  for(const edge of CITY_PLAN.edges){
    if(groups.get(edge.from)===groups.get(edge.to))continue;
    const line=edgeCenterline(CITY_PLAN,edge),section=sections[edge.cls];
    const lengths=[0];
    for(let i=1;i<line.length;i++)lengths.push(lengths[i-1]!+Math.hypot(line[i]![0]-line[i-1]![0],line[i]![1]-line[i-1]![1]));
    const length=lengths.at(-1)!;
    const sample=(distance:number,side=0):Point=>{
      let i=1;while(i<line.length-1 && distance>lengths[i]!)i++;
      const a=line[i-1]!,b=line[i]!,span=lengths[i]!-lengths[i-1]!,ux=(b[0]-a[0])/span,uz=(b[1]-a[1])/span;
      return [a[0]+ux*(distance-lengths[i-1]!)-uz*side,a[1]+uz*(distance-lengths[i-1]!)+ux*side];
    };
    function strip(start:number,end:number,lo:number,hi:number,color:string,h=.055){
      if(end<=start)return;
      const points=[sample(start),...line.filter((_,i)=>lengths[i]!>start && lengths[i]!<end),sample(end)];
      mesh.band(points,lo,hi,color,h);
    }
    const neighbors=[edge.from,edge.to].map(id=>throughNeighbor(CITY_PLAN,id,edge));
    const bends=[edge.from,edge.to].map(id=>bendRun(CITY_PLAN,edge,id));
    const limits=[edge.from,edge.to].map((id,index)=>{
      const origin=line[index?line.length-1:0]!;
      const crossing=approaches.find(c=>c.edge===edge.id&&c.node===id);
      if(!crossing){
        const other=neighbors[index];
        if(other && sections[other.cls].lanes<section.lanes)return bends[index]!+taperLength+1;
        if(other && sections[other.cls].lanes>section.lanes)return -1;
        return 8;
      }
      const [a,b]=crossing.path as [Point,Point];
      return Math.hypot((a[0]+b[0])/2-origin[0],(a[1]+b[1])/2-origin[1])+1.5;
    });
    const start=limits[0]!+1,end=length-limits[1]!-1;
    if(section.median && end-start>=8){
      const r=section.median/2;
      const ring=(radius:number):Point[]=>{
        const result:Point[]=[];
        for(const [u,a] of [[end-r,-Math.PI/2],[start+r,Math.PI/2]] as const){
          for(let j=0;j<=8;j++)result.push(sample(u+radius*Math.cos(a+j*Math.PI/8),radius*Math.sin(a+j*Math.PI/8)));
          const along=lengths.filter(d=>d>start+r&&d<end-r);
          for(const d of (u===end-r?along.reverse():along))result.push(sample(d,u===end-r?radius:-radius));
        }
        return result;
      };
      const outer=ring(r),inner=ring(r-.18);mesh.polygon(inner,.155,p.planting);
      for(const [i,a] of outer.entries()){
        const j=(i+1)%outer.length;mesh.polygon([a,outer[j]!,inner[j]!,inner[i]!],.19,p.curb);
        mesh.wall(a,outer[j]!,.032,.19,p.curb);mesh.wall(inner[j]!,inner[i]!,.155,.19,p.curb);
      }
    }
    if(edge.cls==="alley")continue;
    for(const sign of [-1,1]){
      if(bends.some(Boolean)){
        mesh.band(bendEdgeMarking(CITY_PLAN,edge,sign,bends[0]?0:start,bends[1]?0:length-end),-.055,.055,p.marking,.055);
      }else strip(start,end,sign*(section.road/2-.3)-.055,sign*(section.road/2-.3)+.055,p.marking);
      if(section.lanes===2){
        const yellow=sign*.11;
        if(neighbors[0] && sections[neighbors[0].cls].lanes<section.lanes)strip(0,start-.35,yellow-.045,yellow+.045,p.yellow);
        if(neighbors[1] && sections[neighbors[1].cls].lanes<section.lanes)strip(end+.35,length,yellow-.045,yellow+.045,p.yellow);
        const offset=sign*(section.median/2+section.lane);
        for(let u=start;u+3<end;u+=9)strip(u,u+3,offset-.075,offset+.075,p.marking);
      }else strip(start,end,sign*.11-.045,sign*.11+.045,p.yellow);
    }
    if(end-start>11){
      for(const t of [.31,.77]){
        const [x,z]=sample(start+(end-start)*t,section.road*.28);
        place("manhole",x,z,[1,1,1],"#ffffff",0,.043);
      }
      const [x,z]=sample(start+3,-section.road/2-.66);
      place("hydrant",x,z,[1,1,1],"#ffffff");
    }
    const shelterEdge=["ridge-market/central-market","central-market/market-end","central-south/central-harbor","central-harbor/central-market"].includes(edge.id);
    const shelter=sample(length*.54,section.road/2+1.8);
    if(shelterEdge){
      const [x,z]=shelter,next=sample(length*.54+1,section.road/2+1.8);
      place("bus-shelter",x,z,[1,1,1],"#ffffff",Math.atan2(z-next[1],next[0]-x));
    }
    if(edge.cls!=="quay"){
      const street=edge.name??edge.id;
      const local=edge.cls==="local", treeSpacing=local?11:9;
      let nextStation=start+4;
      for(let u=start+4;u<end-3;u+=treeSpacing){
        const center=sample(u), preferred=nextLampSide.get(street)??1;
        for(const side of [preferred,-preferred]){
          const [x,z]=sample(u,side*(section.road/2+1.15));
          if((shelterEdge&&Math.hypot(shelter[0]-x,shelter[1]-z)<4.6) || !permitsStreetTree(x,z,2.2) || stops.some(([sx,sz])=>Math.hypot(x-sx,z-sz)<4.5))continue;
          if(u>=nextStation && lampSites.every(lamp=>Math.hypot(lamp.x-x,lamp.z-z)>=20)){
            lampSites.push({x,z,yaw:Math.atan2(center[0]-x,center[1]-z),scale:(local?6:8)/3.72});
            nextLampSide.set(street,-side);
            nextStation=u+(local?30:25);
          }else if(clearsFrontage(x,z,3.4*.87,marketBuildings) && permitsStreetTree(x,z,3.4*.87))tree(x,z,.87);
        }
      }
    }
    for(const arrow of laneArrows(edge,start,end,sample))mesh.polygon(arrow,.057,p.marking);
  }
  for(const c of approaches){
    const [a,b]=c.path as [Point,Point],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
    if(c.marked)for(let u=.5;u+.5<=len;u++)mesh.band([[a[0]+dx*u/len,a[1]+dz*u/len],[a[0]+dx*(u+.5)/len,a[1]+dz*(u+.5)/len]],-1.5,1.5,p.marking,.06);
    const edge=CITY_PLAN.edges.find(e=>e.id===c.edge)!,sec=sections[edge.cls];
    const node=CITY_PLAN.nodes.find(n=>n.id===c.node)!;
    if(node.control==="stop" && edge.cls==="arterial")continue;
    const cx=(a[0]+b[0])/2,cz=(a[1]+b[1])/2;
    const ux=-dz/len,uz=dx/len;
    const at=(offset:number):Point=>[cx+ux*2.45+uz*offset,cz+uz*2.45-ux*offset];
    mesh.band([at(sec.median/2+.12),at(sec.road/2-.2)],-.15,.15,p.marking,.059);
  }
  // Place low lamps along the public walks, outside building plots and the walking surface.
  const entries=openSpaceEntries(0);
  for(const walk of [...gardenWalks,gardenPath]){
    let distance=0;
    for(let i=1;i<walk.length-1;i++){
      const [x,z]=walk[i]!,previous=walk[i-1]!,dx=x-previous[0],dz=z-previous[1],step=Math.hypot(dx,dz);
      distance+=step;
      if(distance<9 || towerSites.some(s=>Math.abs(x-s.x)<s.width/2 && Math.abs(z-s.z)<s.depth/2))continue;
      for(const side of [1,-1]){
        const px=x-side*1.55*dz/step,pz=z+side*1.55*dx/step;
        if(!permitsStreetTree(px,pz,.65) || !clearsFrontage(px,pz,1,marketBuildings)
          || entries.some(e=>Math.hypot(px-e.nearest[0],pz-e.nearest[1])<2.8)
          || lampSites.some(l=>Math.hypot(px-l.x,pz-l.z)<20)
          || furniture.some(f=>f.module==="street-tree" && Math.hypot(px-f.at[0],pz-f.at[2])<3.6))continue;
        lampSites.push({x:px,z:pz,yaw:Math.atan2(x-px,z-pz),scale:4.5/3.72});
        distance=-12;
        break;
      }
    }
  }
  const walkBoundaries=[...roads,...sides,{polygon:civicPlaza}];
  const exercise=pavementLayer(walkBoundaries);
  const sidewalksByEdge=sides.map(side=>side.outside);
  for(const building of marketBuildings.filter(b=>b.kitVariant!==undefined)){
    const {x,z,w,d,shopSide}=building, yaw=shopSide*Math.PI/2;
    const nx=Math.sin(yaw),nz=Math.cos(yaw),depth=shopSide%2?w:d,width=shopSide%2?d:w;
    const bays=Math.max(1,Math.round(width/3.2)),u=bays%2?0:(width-.92)/(2*bays);
    const door:Point=[x+nx*depth/2+nz*u,z+nz*depth/2-nx*u];
    const {nearest,distance}=closestWalk(door,sidewalksByEdge);
    if(distance>.05){
      const end:Point=[nearest[0]+(nearest[0]-door[0])/distance,nearest[1]+(nearest[1]-door[1])/distance];
      exercise.pave(ribbon([door,end],1.1));
    }
  }
  exercise.pave(ribbon(gardenPath,.75,true));
  exercise.pave(ribbon([entry,[entry[0]-1.4,74],[entry[0]-2.4,70]],.75));
  for(const polygon of exercise.patches)mesh.polygon(polygon,walkGrade,p.sidewalk);
  walkBoundaries.push(...exercise.patches.map(polygon=>({polygon})));
  return {ground:mesh.finish(),furniture,lampSites,walkBoundaries};
}

function buildShore(){
  const hard=meshData(),submerged=meshData(),sand=meshData(),details:Placement[]=[];
  const swash:number[]=[];
  let along=0,prior=coast.at(-1)!.type;
  for(const [i,a] of coast.entries()){
    const b=coast[(i+1)%coast.length]!,type=a.type;
    const [x,z]=a.crest,dx=b.crest[0]-x,dz=b.crest[1]-z,len=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz);
    const {start,end}=shorePanels[i]!;
    const bands=[["crest","beach"],["beach","waterline"],["waterline","toe"]] as const;
    for(const [from,to] of bands){
      // The bathymetric mesh owns the submerged slopes of beaches and rock banks.
      if(to==="toe" && (type==="beach"||type==="revetment"))continue;
      const mesh=to==="toe"?submerged:type==="beach"?sand:hard;
      const color=type==="beach"?p.beach:type==="revetment"?(i%4?"#797e71":"#919383"):p.seawall;
      mesh.triangle(start[from],end[from],start[to],color);
      mesh.triangle(start[to],end[from],end[to],color);
      if(type==="beach"){
        const left=to==="waterline"?start.swash:[0,0],right=to==="waterline"?end.swash:[0,0];
        swash.push(0,0,0,0,...left,...left,0,0,...right);
      }
    }
    if(type!==prior)along=0;
    const item=(module:string,ox:number,oz:number,y:number,size:Placement["size"],color:string,angle=yaw)=>
      details.push({module,at:[x+ox,y,z+oz],size,color,yaw:angle});
    const inward:Point[]=[a.crest,b.crest].map(([px,pz])=>[px-dz/len*.28,pz+dx/len*.28]);
    const apron=surfaceHeight(x,z);
    if(type==="quay"||type==="seawall"){
      hard.polygon([inward[0]!,inward[1]!,[...b.crest],[...a.crest]],.055,p.curb);
      if(type==="quay"){
        if(Math.floor(along/8)!==Math.floor((along+len)/8))item("wall",dz/len*.13,-dx/len*.13,-.20,[.52,.70,.85],"#444949");
        if(Math.floor(along/15)!==Math.floor((along+len)/15))item("wall",-dz/len*.55,dx/len*.55,apron,[.30,.42,.30],"#444944");
        if(Math.floor(along/30)!==Math.floor((along+len)/30)){
          for(const offset of [-.23,.23])item("wall",dx/len*offset+dz/len*.2,dz/len*offset-dx/len*.2,-1.1,[.07,apron+1.3,.07],"#676d68");
          for(let h=-1;h<apron;h+=.27)item("wall",dz/len*.2,-dx/len*.2,h,[.08,.06,.5],"#777d77");
        }
      }else{
        const atPier=[13.5,23.5,33.5,43.5,59].some(pier=>Math.abs(z+dz/2-pier)<1.8);
        if(!atPier){
          item("wall",dx/2,dz/2,apron+.87,[.08,.09,len],"#525e59");
          item("wall",0,0,apron,[.10,.94,.10],"#525e59");
        }
        if(z>50)hard.band([[...a.crest],[...b.crest]],0,6,p.promenade,.065);
      }
    }else if(type==="revetment"){
      const span=.8+(i%7)*.12;
      const [rx,rz]=a.waterline,top=[rx,span*.45,rz];
      const rim=Array.from({length:6},(_,j)=>{
        const angle=(j+i*.36)*Math.PI/3;
        return [rx+span*.65*Math.cos(angle),-.24,rz+span*.49*Math.sin(angle)];
      });
      // Only the submerged rock faces belong in the underwater refraction pass.
      const fraction=(WATER_LEVEL-top[1]!)/(-.24-top[1]!);
      const lip=rim.map(([px,,pz])=>[rx+(px!-rx)*fraction,WATER_LEVEL,rz+(pz!-rz)*fraction]);
      for(const [j,point] of rim.entries()){
        const next=(j+1)%rim.length,color=j%3?"#858878":"#989c8b";
        hard.triangle(top,lip[j]!,lip[next]!,color);
        submerged.triangle(lip[j]!,point,rim[next]!,color);
        submerged.triangle(lip[j]!,rim[next]!,lip[next]!,color);
      }
    }
    if(type==="seawall" && z>=58 && z<60){
      for(let k=0;k<8;k++)item("wall",dz/len*k*.33,-dx/len*k*.33,apron-.23*k-.21,[.35,.23,1.8],p.curb);
    }
    prior=type;along+=len;
  }
  const beach=sand.finish();
  beach.setAttribute("swashDirection",new Float32BufferAttribute(swash,2));
  beach.computeBoundingSphere();
  beach.boundingSphere!.radius+=1.6;
  return {hard:hard.finish(),submerged:submerged.finish(),sand:beach,details};
}
export function CityGround({night,cutout,occupiedCount,onPlot,cameraFocus}:{cameraFocus?:RefObject<Vector3>;night:boolean;cutout?:Plane[];occupiedCount:number|null;onPlot?:(id:number)=>void}){
  const {ground,furniture,lampSites,walkBoundaries}=useMemo(buildGround,[]),shore=useMemo(buildShore,[]),ocean=useOcean();
  const gardens=useMemo(()=>{
    const mesh=meshData();
    const {items,patches,terraces}=gardenPavement(occupiedCount,walkBoundaries);
    for(const polygon of patches)mesh.polygon(polygon,walkGrade,p.sidewalk);
    const lights=[...lampSites];
    for(const {site,outline,nearest} of terraces){
      const furniture=assembleInterim(site,false).filter(p=>p.module==="street-tree" || p.module==="bench" || p.module==="fountain-basin");
      // Choose the darkest clear edge of the terrace and face the light toward the seats.
      let best:LampSite|undefined, clearance=15;
      for(const [i,a] of outline.entries()){
        const b=outline[(i+1)%outline.length]!;
        const x=site.x+.84*((a[0]+b[0])/2-site.x),z=site.z+.84*((a[1]+b[1])/2-site.z);
        if(Math.hypot(x-nearest[0],z-nearest[1])<3 || furniture.some(p=>Math.hypot(x-p.at[0],z-p.at[2])<(p.module==="bench"?1.8:3.2)))continue;
        const gap=Math.min(...lights.map(l=>Math.hypot(x-l.x,z-l.z)));
        if(gap>clearance){clearance=gap;best={x,z,scale:4.2/3.72,yaw:Math.atan2(site.x-x,site.z-z)};}
      }
      if(best)lights.push(best);
    }
    return {items,entries:mesh.finish(),lights};
  },[occupiedCount,walkBoundaries,lampSites]);
  useEffect(()=>()=>gardens.entries.dispose(),[gardens]);
  const landscape=useMemo(()=>[...furniture,...shore.details,...gardens.items],[furniture,shore,gardens]);
  useEffect(()=>()=>{ground.dispose();shore.hard.dispose();shore.submerged.dispose();shore.sand.dispose();},[ground,shore]);
  const clipping={clippingPlanes:cutout??null,clipIntersection:!!cutout};
  return <group name="City streets and shoreline">
    <mesh layers-mask={1<<DRY_LAYER} geometry={ground} receiveShadow><meshStandardMaterial vertexColors roughness={.95} side={DoubleSide} {...clipping}/></mesh>
    {!cutout&&gardens.entries.getAttribute("position").count>0&&<mesh layers-mask={1<<DRY_LAYER} geometry={gardens.entries} receiveShadow
      onClick={event=>{
        if(!onPlot || event.delta>=5 || occupiedCount===null)return;
        const plot=towerSites.find(s=>s.id>=occupiedCount && (s.interimForm==="park"||s.interimForm==="plaza")
          && Math.abs(event.point.x-s.x)<=s.width/2 && Math.abs(event.point.z-s.z)<=s.depth/2);
        if(plot){event.stopPropagation();onPlot(plot.id);}
      }}><meshStandardMaterial vertexColors roughness={.95}/></mesh>}
    <mesh renderOrder={-1} geometry={shore.submerged} receiveShadow><meshStandardMaterial vertexColors roughness={.96} side={DoubleSide} {...clipping}/></mesh>
    <mesh layers-mask={1<<DRY_LAYER} renderOrder={-1} geometry={shore.hard} receiveShadow><meshStandardMaterial vertexColors roughness={.96} side={DoubleSide} {...clipping}/></mesh>
    <mesh layers-mask={1<<DRY_LAYER} renderOrder={-1} geometry={shore.sand} receiveShadow><meshStandardMaterial key={ocean.bed.texture.uuid} vertexColors side={DoubleSide} roughness={.96} onBeforeCompile={shader=>patchSand(shader,ocean,"cityBeach")} {...clipping}/></mesh>
    {!cutout&&cameraFocus&&<CityStreetLamps sites={gardens.lights} night={night} focus={cameraFocus}/>}
    {!cutout&&<Suspense fallback={null}><BackgroundBuildings buildings={marketBuildings} night={night} landscape={landscape}/></Suspense>}
  </group>;
}
