import { berths, breakwaterArms, marketQuay, vesselBeams, vesselLengths, WORK_BOAT_BERTH, workingQuay } from "../city/harbor-plan.ts";
import type { Point } from "../loop-path.ts";

type Pose={x:number;z:number;yaw:number};
type Edge={a:Point;b:Point;radius:number;name:string};
function footprint(length:number,beam:number,corner:number,margin:number){
  const halfX=length/2-corner, halfZ=beam/2-corner;
  const corners:Point[]=[[-halfX,-halfZ],[halfX,-halfZ],[halfX,halfZ],[-halfX,halfZ]];
  return {halfX,halfZ,corner,margin,corners};
}
const workingHull=footprint(20.6,5.8,1.4,1.5);


function segmentDistance([x,z]:Point,[ax,az]:Point,[bx,bz]:Point){
  const dx=bx-ax,dz=bz-az;
  const u=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-ax-u*dx,z-az-u*dz);
}
function crossesRect(a:Point,b:Point,halfX:number,halfZ:number){
  let from=0,to=1;
  for(const axis of [0,1] as const){
    const limit=axis===0?halfX:halfZ,delta=b[axis]-a[axis];
    if(!delta){if(Math.abs(a[axis])>limit)return false;continue;}
    const u=(-limit-a[axis])/delta,v=(limit-a[axis])/delta;
    from=Math.max(from,Math.min(u,v));to=Math.min(to,Math.max(u,v));
  }
  return from<=to;
}
function polygonEdges(points:Point[],name:string,radius=0):Edge[]{
  return points.map((a,i)=>({a,b:points[(i+1)%points.length]!,name,radius}));
}
const obstacles:Edge[]=[
  ...breakwaterArms.flatMap(arm=>arm.slice(1).map((b,i)=>({a:arm[i]!,b,name:"breakwater",radius:3}))),
  ...polygonEdges([[workingQuay.start,workingQuay.edge],[workingQuay.end,workingQuay.edge],
    [workingQuay.end,workingQuay.back],[workingQuay.start,workingQuay.back]],"working quay",.24),
  {a:[marketQuay.edge,marketQuay.start],b:[marketQuay.edge,marketQuay.end],name:"market quay",radius:.24},
  ...[13.5,43.5].map(z=>({a:[-4.25,z] as Point,b:[8.25,z] as Point,name:"fishing pier",radius:.66})),
  {a:[-12,60],b:[14,60],name:"marina",radius:.65},
  ...[...berths,{name:"WorkingBoat",x:WORK_BOAT_BERTH.position[0],z:WORK_BOAT_BERTH.position[1],yaw:0}].flatMap(berth=>{
    const c=Math.cos(berth.yaw),s=Math.sin(berth.yaw);
    return polygonEdges([[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>{
      const x=u!*vesselLengths[berth.name]!/2,z=v!*vesselBeams[berth.name]!/2;
      return [berth.x+x*c+z*s,berth.z-x*s+z*c];
    }),berth.name);
  }),
];
export function basinClearance(center:Point,radius:number){
  return Math.min(...obstacles.map(e=>segmentDistance(center,e.a,e.b)-e.radius-radius));
}
export function pointClearance(p:Pose,x:number,z:number,radius:number){
  const dx=x-p.x,dz=z-p.z,c=Math.cos(p.yaw),s=Math.sin(p.yaw);
  const {halfX,halfZ}=workingHull;
  const longitudinal=Math.max(0,Math.abs(dx*c-dz*s)-halfX);
  const lateral=Math.max(0,Math.abs(dx*s+dz*c)-halfZ);
  return Math.hypot(longitudinal,lateral)-workingHull.corner-radius-workingHull.margin;
}
// The rounded hull is the inset rectangle plus a disk at every point on its edge.
export function harborClearance(p:Pose,alongside=false){
  const hull=workingHull;
  const {halfX,halfZ}=hull;
  const c=Math.cos(p.yaw),s=Math.sin(p.yaw);
  function local([x,z]:Point):Point{return [(x-p.x)*c-(z-p.z)*s,(x-p.x)*s+(z-p.z)*c];}
  const toRect=([x,z]:Point)=>Math.hypot(Math.max(0,Math.abs(x)-halfX),Math.max(0,Math.abs(z)-halfZ));
  let minimum=Infinity,obstacle="";
  for(const e of obstacles){
    if(e.name==="WorkingBoat")continue;
    const a=local(e.a),b=local(e.b);
    const distance=crossesRect(a,b,halfX,halfZ)?0:Math.min(toRect(a),toRect(b),...hull.corners.map(q=>segmentDistance(q,a,b)));
    const margin=alongside && e.name==="working quay"?0:hull.margin;
    const gap=distance-hull.corner-e.radius-margin;
    if(gap<minimum){minimum=gap;obstacle=e.name;}
  }
  return {minimum,obstacle};
}
