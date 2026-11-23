import {transitionBend} from "./transition-bend.ts";
import { CatmullRomCurve3, Vector3 } from "three";

export type Point = [x: number, z: number];
export type StreetClass = "boulevard" | "arterial" | "local" | "alley" | "quay";
export interface StreetNode {
  id: string; x: number; z: number; control?: "signal" | "stop" | "none";
  // Neighboring nodes whose approaches have no pedestrian crossing.
  unmarked?: string[];
  bendSetback?: number;
}
export interface StreetEdge { id: string; from: string; to: string; cls: StreetClass; bend?: Point[]; name?: string }
export interface StreetGraph {nodes: StreetNode[]; edges: StreetEdge[]}
export const sections = {
  boulevard: { width:30, road:15.2, lanes:2, lane:3.3, median:2 },
  arterial: { width:22, road:15, lanes:2, lane:3.3, median:1.8 },
  local: { width:14, road:6.4, lanes:1, lane:3.2, median:0 },
  alley: { width:6, road:6, lanes:1, lane:3, median:0 },
  quay: { width:12, road:7, lanes:1, lane:3.5, median:0 },
} as const;
const plus=(a:Point,b:Point,k:number):Point=>[a[0]+b[0]*k,a[1]+b[1]*k];
const sub=(a:Point,b:Point):Point=>[a[0]-b[0],a[1]-b[1]];
const unit=(v:Point):Point=>{const n=Math.hypot(...v);return n?[v[0]/n,v[1]/n]:[0,0];};
const left=(v:Point):Point=>[-v[1],v[0]];
const cross=(a:Point,b:Point)=>a[0]*b[1]-a[1]*b[0];
const interpolate=(a:Point,b:Point,t:number)=>plus(a,sub(b,a),t);
export const area=(p:Point[])=>p.reduce((s,a,i)=>s+cross(a,p[(i+1)%p.length]!),0)/2;

const bendTangents=new WeakMap<Point,Point>();
const alignmentCache=new WeakMap<StreetGraph,Map<StreetEdge,Point[]>>();
export function edgeCenterline(graph:StreetGraph, edge:StreetEdge):Point[] {
  let cache=alignmentCache.get(graph);
  if(!cache){cache=new Map();alignmentCache.set(graph,cache);}
  const cached=cache.get(edge);if(cached)return cached.slice();
  const node=(id:string)=>graph.nodes.find(n=>n.id===id)!;
  const endpoint=(id:string):Point=>[node(id).x,node(id).z];
  const p=[endpoint(edge.from),...edge.bend??[],endpoint(edge.to)];
  let line=p;
  if(p.length>2){
    const curve=new CatmullRomCurve3(p.map(([x,z])=>new Vector3(x,0,z)),false,"centripetal");
    line=curve.getSpacedPoints(Math.max(p.length,Math.ceil(curve.getLength()/2))).map(v=>[v.x,v.z]);
  }
  for(const id of [edge.from,edge.to]){
    const setback=node(id).bendSetback;
    if(!setback)continue;
    const incident=graph.edges.filter(e=>e.from===id||e.to===id);
    const center=endpoint(id);
    const [a,b]=incident.map(e=>unit(sub(endpoint(e.from===id?e.to:e.from),center))) as [Point,Point];
    const bend=transitionBend(plus(center,a,setback),[-a[0],-a[1]],plus(center,b,setback),b,.33*setback);
    const first=incident[0]===edge;
    // Both legs use the same polynomial and the same midpoint.
    const half=Array.from({length:33},(_,i)=>{
      const t=.5+(first?-1:1)*i/64,point=bend.point(t);
      bendTangents.set(point,unit(bend.tangent(t)));
      return point;
    });
    if(id===edge.from)line=[...half,...line.slice(1)];
    else line=[...line.slice(0,-1),...half.reverse()];
  }
  cache.set(edge,line);
  return line.slice();
}

// Intersect parallel offsets of adjacent segments. A straight join uses its normal.
function join(p:Point,a:Point,b:Point,da:number,db:number):Point{
  const first=plus(p,left(a),da), second=plus(p,left(b),db), det=cross(a,b);
  // A shallow change in sidewalk width must not produce a long spike.
  if(Math.abs(det)<.0001 || (Math.abs(det)<.24 && Math.abs(Math.abs(da)-Math.abs(db))>.01))
    return interpolate(first,second,.5);
  return plus(first,a,cross(sub(second,first),b)/det);
}
function directionAt(point:Point,forward:Point){
  const tangent=bendTangents.get(point);
  if(!tangent)return forward;
  return tangent[0]*forward[0]+tangent[1]*forward[1]>=0?tangent:unit([-tangent[0],-tangent[1]]);
}
export function offsetLine(p:Point[],d:number):Point[]{
  return p.map((v,i)=>{
    const a=unit(sub(v,p[Math.max(0,i-1)]!)), b=unit(sub(p[Math.min(p.length-1,i+1)]!,v));
    if(bendTangents.has(v))return plus(v,left(directionAt(v,i===0?b:a)),d);
    return i===0?plus(v,left(b),d):i===p.length-1?plus(v,left(a),d):join(v,a,b,d,d);
  });
}
type Offset = (e:StreetEdge)=>number;
export const taperLength=16;
export function bendRun(graph:StreetGraph,edge:StreetEdge,id:string){
  if(!graph.nodes.find(n=>n.id===id)?.bendSetback)return 0;
  const line=edgeCenterline(graph,edge);
  if(edge.to===id)line.reverse();
  let d=0;
  for(let i=1;i<line.length && bendTangents.has(line[i]!);i++)d+=Math.hypot(...sub(line[i]!,line[i-1]!));
  return d;
}
export function throughNeighbor(graph:StreetGraph,id:string,edge:StreetEdge){
  if(graph.edges.filter(e=>e.from===id || e.to===id).length!==2)return;
  const incident=arms(graph,id);
  const [a,b]=incident as [Arm,Arm];
  const straight=a.direction[0]*b.direction[0]+a.direction[1]*b.direction[1]<-.8;
  if(straight)return a.edge===edge?b.edge:a.edge;
}
function endOffset(graph:StreetGraph,id:string,edge:StreetEdge,offset:Offset){
  const other=throughNeighbor(graph,id,edge);
  return other ? Math.min(offset(edge),offset(other)) : offset(edge);
}

function curbWidth(graph:StreetGraph,id:string,edge:StreetEdge,side:number,offset:Offset){
  const all=arms(graph,id),i=all.findIndex(a=>a.edge===edge),a=all[i]!;
  const b=all[(i+side+all.length)%all.length]!;
  // Opposing streets share this curb even when a third street joins the other side.
  const sweep=(side*(b.angle-a.angle)+2*Math.PI)%(2*Math.PI);
  if((all.length===2 && sweep>Math.PI) || a.direction[0]*b.direction[0]+a.direction[1]*b.direction[1]<-.98)
    return Math.min(offset(edge),offset(b.edge));
  return endOffset(graph,id,edge,offset);
}

// Through a two-arm junction, narrow the wider approach gradually to the connecting street.
function streetSide(graph:StreetGraph,edge:StreetEdge,side:number,offset:Offset,followCurb=true){
  const line=edgeCenterline(graph,edge),width=offset(edge);
  const widthAt=(id:string,sign:number)=>followCurb?curbWidth(graph,id,edge,sign,offset):endOffset(graph,id,edge,offset);
  const head=widthAt(edge.from,side),tail=widthAt(edge.to,-side);
  if(head===width && tail===width)return offsetLine(line,side*width);
  const stations=[0];
  for(let i=1;i<line.length;i++)stations.push(stations[i-1]!+Math.hypot(...sub(line[i]!,line[i-1]!)));
  const length=stations.at(-1)!,headHold=bendRun(graph,edge,edge.from),tailHold=bendRun(graph,edge,edge.to);
  const run=Math.min((length-headHold-tailHold)/2,taperLength);
  const transitionSamples=Array.from({length:25},(_,i)=>run*i/24);
  const distances=[...new Set([...stations,...transitionSamples.map(d=>headHold+d),
    ...transitionSamples.map(d=>length-tailHold-d)])].sort((a,b)=>a-b);
  const normals=offsetLine(line,1);
  const ease=(t:number)=>t<=0?0:t>=1?1:t*t*t*(10+t*(-15+6*t));
  return distances.map(d=>{
    const i=Math.max(1,stations.findIndex(s=>s>=d)),t=(d-stations[i-1]!)/(stations[i]!-stations[i-1]!);
    const center=interpolate(line[i-1]!,line[i]!,t);
    const normal=sub(interpolate(normals[i-1]!,normals[i]!,t),center);
    const w=width+(head-width)*ease(1-(d-headHold)/run)+(tail-width)*ease(1-(length-d-tailHold)/run);
    return plus(center,normal,side*w);
  });
}
export function bendEdgeMarking(graph:StreetGraph,edge:StreetEdge,side:number,insetStart:number,insetEnd:number){
  const line=streetSide(graph,edge,side,e=>sections[e.cls].road/2-.3);
  function trim(points:Point[],distance:number){
    let i=0;
    while(distance>0 && i+1<points.length){
      const a=points[i]!,b=points[i+1]!,length=Math.hypot(...sub(b,a));
      if(distance<length)return [interpolate(a,b,distance/length),...points.slice(i+1)];
      distance-=length;i++;
    }
    return points.slice(i);
  }
  return trim(trim(line,insetStart).reverse(),insetEnd).reverse();
}
const strip=(p:Point[],a:number,b:number)=>[...offsetLine(p,a),...offsetLine(p,b).reverse()];
interface Arm {edge:StreetEdge; line:Point[]; direction:Point; angle:number}
function arms(graph:StreetGraph,id:string):Arm[]{
  return graph.edges.filter(e=>e.from===id||e.to===id).map(edge=>{
    const line=edgeCenterline(graph,edge);if(edge.to===id)line.reverse();
    const direction=directionAt(line[0]!,unit(sub(line[1]!,line[0]!)));
    return {edge,line,direction,angle:Math.atan2(direction[1],direction[0])};
  }).sort((a,b)=>a.angle-b.angle);
}
// Both halves of a convex corner share this arc, including its midpoint.
function outerArc(a:Arm,b:Arm,ra:number,rb:number){
  const turn=(b.angle-a.angle+2*Math.PI)%(2*Math.PI)-Math.PI;
  if(turn<=.015)return;
  const steps=2*Math.ceil(turn/(Math.PI/12));
  return Array.from({length:steps+1},(_,i):Point=>{
    const t=i/steps,angle=a.angle+Math.PI/2+turn*t,r=ra+(rb-ra)*t;
    return plus(a.line[0]!,[Math.cos(angle),Math.sin(angle)],r);
  });
}
function junction(graph:StreetGraph,id:string){
  const ends=arms(graph,id), polygon:Point[]=[];
  if(ends.length<2 || graph.nodes.find(n=>n.id===id)?.bendSetback)return polygon;
  for(let i=0;i<ends.length;i++){
    const a=ends[i]!, b=ends[(i+1)%ends.length]!, p=a.line[0]!;
    const halfRoad=(e:StreetEdge)=>sections[e.cls].road/2;
    const ra=curbWidth(graph,id,a.edge,1,halfRoad), rb=curbWidth(graph,id,b.edge,-1,halfRoad);
    const turn=(b.angle-a.angle+Math.PI*2)%(Math.PI*2);
    const arc=outerArc(a,b,ra,rb);
    if(arc){polygon.push(...arc);continue;}
    if(turn>=Math.PI-.02){polygon.push(plus(p,left(a.direction),ra),plus(p,left(b.direction),-rb));continue;}
    const corner=join(p,a.direction,b.direction,ra,-rb);
    const radius=a.edge.cls==="arterial"||b.edge.cls==="arterial"?6:4;
    const trim=Math.min(12,radius/Math.tan(turn/2));
    const start=plus(corner,a.direction,trim), end=plus(corner,b.direction,trim);
    for(let j=0;j<=8;j++){const t=j/8;polygon.push(interpolate(interpolate(start,corner,t),interpolate(corner,end,t),t));}
  }
  return polygon;
}
export function roadSurfaces(graph:StreetGraph){
  const halfRoad=(e:StreetEdge)=>sections[e.cls].road/2;
  const segments=graph.edges.map(e=>({id:e.id,polygon:[...streetSide(graph,e,1,halfRoad),...streetSide(graph,e,-1,halfRoad).reverse()]}));
  return segments.concat(graph.nodes.map(n=>({id:n.id,polygon:junction(graph,n.id)})).filter(s=>s.polygon.length>=3));
}
// Match each side of an approach to its neighbor. Adjacent walks share the
// same corner even when their widths differ or the node is a T-junction.
function cornerAt(graph:StreetGraph,id:string,edge:StreetEdge,side:number,offset:(e:StreetEdge)=>number):Point {
  const all=arms(graph,id),i=all.findIndex(a=>a.edge.id===edge.id),a=all[i]!;
  const p=a.line[0]!,distance=curbWidth(graph,id,edge,side,offset)*side;
  if(all.length===1)return plus(p,left(a.direction),distance);
  const neighbor=all[(i+side+all.length)%all.length]!;
  return join(p,a.direction,neighbor.direction,distance,-side*curbWidth(graph,id,neighbor.edge,-side,offset));
}
function joinedSide(graph:StreetGraph,e:StreetEdge,side:number,offset:(e:StreetEdge)=>number){
  const line=streetSide(graph,e,side,offset);
  function cap(id:string,sign:number){
    const all=arms(graph,id),i=all.findIndex(a=>a.edge===e),a=all[i]!;
    if(all.length>1){
      const b=all[(i+sign+all.length)%all.length]!;
      const ra=curbWidth(graph,id,e,sign,offset),rb=curbWidth(graph,id,b.edge,-sign,offset);
      const arc=sign===1?outerArc(a,b,ra,rb):outerArc(b,a,rb,ra)?.reverse();
      if(arc)return arc.slice(0,(arc.length+1)/2).reverse();
    }
    return [cornerAt(graph,id,e,sign,offset)];
  }
  const first=cap(e.from,side),last=cap(e.to,-side);
  const start=first.at(-1)!,end=last.at(-1)!;
  const head=unit(sub(line[1]!,line[0]!)),tail=unit(sub(line.at(-1)!,line.at(-2)!));
  const forward=(a:Point,b:Point,dir:Point)=>(a[0]-b[0])*dir[0]+(a[1]-b[1])*dir[1];
  let lo=1,hi=line.length-2;
  while(lo<=hi && forward(line[lo]!,start,head)<=1e-7)lo++;
  while(hi>=lo && forward(end,line[hi]!,tail)<=1e-7)hi--;
  const middle=line.slice(lo,hi+1);
  return [...first,...middle,...last.reverse()];
}
export function sidewalks(graph:StreetGraph){
  return graph.edges.filter(e=>e.cls!=="alley").flatMap(e=>[-1,1].map(side=>{
    const kerb=joinedSide(graph,e,side,e=>sections[e.cls].road/2);
    const outside=joinedSide(graph,e,side,e=>sections[e.cls].width/2);
    const lip=joinedSide(graph,e,side,e=>sections[e.cls].road/2+.18);
    return {edge:e.id,side,kerb,outside,polygon:[...kerb,...outside.slice().reverse()],curb:[...kerb,...lip.reverse()]};
  }));
}
export interface Block {id:string; streetBoundary:Point[]; polygon:Point[]; corners?:number[]}
function inset(p:Point[],distances:number[]) {
  return p.map((v,i)=>{const j=(i+p.length-1)%p.length;return join(v,unit(sub(v,p[j]!)),unit(sub(p[(i+1)%p.length]!,v)),distances[j]!,distances[i]!);});
}
export function blocks(graph:StreetGraph):Block[]{
  // A bridge has the same face on both sides. It must not split a lot boundary.
  const incident=new Map(graph.nodes.map(n=>[n.id,arms(graph,n.id)]));
  const entered=new Map<string,number>(),bridges=new Set<string>();let clock=0;
  function visit(node:string,parent?:string):number{
    let low=++clock;entered.set(node,low);
    for(const {edge} of incident.get(node)!){
      if(edge.id===parent)continue;
      const next=node===edge.from?edge.to:edge.from,known=entered.get(next);
      if(known!==undefined){low=Math.min(low,known);continue;}
      const child=visit(next,edge.id);
      if(child>entered.get(node)!)bridges.add(edge.id);
      low=Math.min(low,child);
    }
    return low;
  }
  for(const n of graph.nodes)if(!entered.has(n.id))visit(n.id);
  const order=new Map([...incident].map(([n,a])=>[n,a.filter(v=>!bridges.has(v.edge.id))]));
  const seen=new Set<string>(),faces:Block[]=[];
  for(const [id,incident] of order)for(const first of incident){
    let at=id,arm=first;const boundary:Point[]=[], widths:number[]=[], ids:string[]=[],corners:number[]=[];
    while(!seen.has(at+'/'+arm.edge.id)){
      seen.add(at+'/'+arm.edge.id);ids.push(at);corners.push(boundary.length);
      for(const p of arm.line.slice(0,-1)){boundary.push(p);widths.push(sections[arm.edge.cls].width/2);}
      at=at===arm.edge.from?arm.edge.to:arm.edge.from;
      const next=order.get(at)!, index=next.findIndex(a=>a.edge.id===arm.edge.id);
      arm=next[(index+next.length-1)%next.length]!;
    }
    if(area(boundary)<=0)continue;
    const polygon=inset(boundary,widths);
    if(area(polygon)>0)faces.push({id:[...ids].sort().join('-'),streetBoundary:boundary,polygon,corners});
  }
  return faces;
}
export function lots(block:Block){
  const p=block.polygon,depth=Math.min(18,Math.sqrt(area(p))*.32),inner=inset(p,p.map(()=>depth));
  const corners=block.corners??p.map((_,i)=>i);
  return corners.flatMap((start,face)=>{
    const end=corners[(face+1)%corners.length]!,indices=[start];
    for(let i=start;i!==end;){i=(i+1)%p.length;indices.push(i);}
    const distances=[0];
    for(let j=1;j<indices.length;j++)distances.push(distances[j-1]!+Math.hypot(...sub(p[indices[j]!]!,p[indices[j-1]!]!)));
    const length=distances.at(-1)!,count=length<9?0:Math.max(1,Math.floor(length/12));
    function at(ring:Point[],d:number):Point{
      let i=1;while(i<distances.length-1 && distances[i]!<d)i++;
      const k=indices[i]!,prev=indices[i-1]!;
      return interpolate(ring[prev]!,ring[k]!, (d-distances[i-1]!)/(distances[i]!-distances[i-1]!));
    }
    return Array.from({length:count},(_,k)=>{
      const a=length*k/count,b=length*(k+1)/count;
      const distancesInLot=[a,...distances.filter(d=>d>a&&d<b),b];
      const front=distancesInLot.map(d=>at(p,d)),back=distancesInLot.map(d=>at(inner,d));
      return {id:block.id+'/'+face+'/'+k,front,polygon:[...front,...back.reverse()]};
    });
  });
}
function approach(graph:StreetGraph, node:string, arm:Arm, all:Arm[]){
  const setback=(e:StreetEdge)=>(sections[e.cls].road+sections[e.cls].width)/4;
  const sides=([-1,1] as const).map(sign=>({sign,corner:cornerAt(graph,node,arm.edge,sign,setback)}));
  let remaining=Math.max(...all.filter(a=>a!==arm).map(a=>sections[a.edge.cls].road/2),0)+4;
  for(let i=1;i<arm.line.length;i++){
    const a=arm.line[i-1]!,delta=sub(arm.line[i]!,a),length=Math.hypot(...delta);
    const direction=unit(delta),normal=left(direction);
    while (remaining<=length) {
      const mid=plus(a,direction,remaining);
      const clear=sides.every(({sign,corner})=>{
        const d=sub(plus(mid,normal,sign*setback(arm.edge)),corner);
        return d[0]*direction[0]+d[1]*direction[1]>=1.5;
      });
      if(clear)return {mid,normal};
      remaining+=.5;
    }
    remaining-=length;
  }
}
// Treat closely spaced junctions as one signal where the intervening road
// cannot fit two zebra crossings and their stop lines.
export function signalJunctions(graph:StreetGraph) {
  const groups = new Map(graph.nodes.map(n=>[n.id,n.id]));
  for (const edge of graph.edges) {
    const a = graph.nodes.find(n=>n.id===edge.from)!, b = graph.nodes.find(n=>n.id===edge.to)!;
    if (edge.cls!=="arterial" && edge.cls!=="boulevard") continue;
    if (a.control!=="signal" && b.control!=="signal") continue;
    const ends=[arms(graph,a.id),arms(graph,b.id)];
    if (ends.some(incident=>incident.length<3)) continue;
    const clearance=ends.reduce((sum,incident)=>sum+4+Math.max(...incident.filter(arm=>arm.edge!==edge).map(arm=>sections[arm.edge.cls].road/2)),3);
    const line=edgeCenterline(graph,edge);
    const length=line.slice(1).reduce((sum,p,i)=>sum+Math.hypot(...sub(p,line[i]!)),0);
    if (length>=clearance) continue;
    const from=groups.get(a.id)!, to=groups.get(b.id)!;
    const control=a.control==="signal"?from:to, other=control===from?to:from;
    for (const [id,group] of groups) if (group===other) groups.set(id,control);
  }
  return groups;
}
export function junctionApproaches(graph:StreetGraph){
  const groups=signalJunctions(graph);
  return graph.nodes.filter(n=>n.control==="signal"||n.control==="stop"||groups.get(n.id)!==n.id).flatMap(n=>{
    const all=arms(graph,n.id);
    return all.flatMap(a=>{
      if(groups.get(a.edge.from)===groups.get(a.edge.to))return [];
      const crossing=approach(graph,n.id,a,all);
      if(!crossing || a.edge.cls==="alley")return [];
      const {mid,normal}=crossing,radius=sections[a.edge.cls].road/2;
      const path=[plus(mid,normal,radius),plus(mid,normal,-radius)];
      const neighbor=a.edge.from===n.id?a.edge.to:a.edge.from;
      return [{node:n.id,edge:a.edge.id,marked:!n.unmarked?.includes(neighbor),path,polygon:strip(path,-1.5,1.5)}];
    });
  });
}
export function crosswalks(graph:StreetGraph){
  return junctionApproaches(graph).filter(a=>a.marked);
}
export function laneCenterlines(graph:StreetGraph){
  return graph.edges.flatMap(e=>[false,true].flatMap(reverse=>{
    return Array.from({length:sections[e.cls].lanes},(_,lane)=>{
      const points=streetSide(graph,e,reverse?-1:1,edge=>{
        const section=sections[edge.cls];
        return section.median/2+(Math.min(lane,section.lanes-1)+.5)*section.lane;
      },false);
      if(reverse)points.reverse();
      const from=reverse?e.to:e.from,to=reverse?e.from:e.to;
      return {edge:e.id,from,to,lane,points,fromBend:!!graph.nodes.find(n=>n.id===from)?.bendSetback,
        toBend:!!graph.nodes.find(n=>n.id===to)?.bendSetback};
    });
  }));
}
type Lane = ReturnType<typeof laneCenterlines>[number];

export function trimmedLane(lane: Lane) {
  const points = lane.points;
  const ends = [0];
  for (let i = 1; i < points.length; i++)
    ends.push(ends[i-1]! + Math.hypot(...sub(points[i]!, points[i-1]!)));
  const length = ends.at(-1)!;
  const trim = Math.min(9, length * .39);
  function cut(d: number) {
    if(d===0)return points[0]!;
    const i = ends.findIndex(end => end >= d);
    return interpolate(points[i-1]!, points[i]!, (d-ends[i-1]!)/(ends[i]!-ends[i-1]!));
  }
  const start=lane.fromBend?0:trim,end=length-(lane.toBend?0:trim);
  return [cut(start),...points.filter((_,i)=>ends[i]!>start && ends[i]!<end),cut(end)];
}

export function turnConnectors(graph: StreetGraph, node: string, lanes = laneCenterlines(graph)) {
  const incoming = lanes.filter(l => l.to === node), outgoing = lanes.filter(l => l.from === node);
  return incoming.flatMap(from => outgoing.filter(to => from.edge !== to.edge).map(to => {
    const a = trimmedLane(from), b = trimmedLane(to);
    const p = a.at(-1)!, q = b[0]!;
    if(from.toBend)return {from,to,points:[p,q]};
    const handle = Math.min(7, Math.hypot(...sub(q,p)) * .47);
    const c = plus(p,unit(sub(p,a.at(-2)!)),handle);
    const d = plus(q,unit(sub(q,b[1]!)),handle);
    const points = Array.from({length:17},(_,i) => {
      const t = i/16, middle = interpolate(c,d,t);
      return interpolate(interpolate(interpolate(p,c,t),middle,t),interpolate(middle,interpolate(d,q,t),t),t);
    });
    return {from,to,points};
  }));
}
export function walkNetwork(graph:StreetGraph){
  const offset=(e:StreetEdge)=>(sections[e.cls].road+sections[e.cls].width)/4;
  const links=crosswalks(graph).map(c=>{
    const edge=graph.edges.find(e=>e.id===c.edge)!,s=sections[edge.cls],dir=unit(sub(c.path[1]!,c.path[0]!));
    const extra=(s.width-s.road)/4;
    return {...c,path:[plus(c.path[0]!,dir,-extra),plus(c.path[1]!,dir,extra)]};
  });
  const paths=graph.edges.filter(e=>e.cls!=="alley").flatMap(e=>[-1,1].map(side=>{
    const line=joinedSide(graph,e,side,offset),inserts=new Map<number,{point:Point;t:number}[]>();
    // Insert the zebra endpoints as vertices, so route compilation can change sides.
    for(const link of links.filter(c=>c.edge===e.id)){
      const point=link.path[(link.node===e.from)===(side>0)?0:1]!;
      let best=Infinity,segment=0,t=0;
      for(let i=0;i<line.length-1;i++){
        const a=line[i]!,d=sub(line[i+1]!,a),q=sub(point,a);
        const u=Math.min(1,Math.max(0,(q[0]*d[0]+q[1]*d[1])/(d[0]**2+d[1]**2||1)));
        const error=Math.hypot(...sub(point,plus(a,d,u)));
        if(error<best){best=error;segment=i;t=u;}
      }
      const group=inserts.get(segment)??[];group.push({point,t});inserts.set(segment,group);
    }
    return {edge:e.id,side,points:line.flatMap((p,i)=>[p,...(inserts.get(i)??[]).sort((a,b)=>a.t-b.t).map(v=>v.point)])};
  }));
  return {paths,crossings:links};
}
