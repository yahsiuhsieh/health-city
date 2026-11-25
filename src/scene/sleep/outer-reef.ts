import { HARBOR_MOUTH } from "../city/harbor-plan.ts";
import { noise, reefPlatform } from "./island-shape.ts";
import type { Point } from "../loop-path.ts";

const [mx,mz]=HARBOR_MOUTH.point;
const axis=-.64;
const center:Point=[mx+201,mz+137];

function place([x,z]:Point,angle:number,origin:Point):Point {
  const c=Math.cos(angle),s=Math.sin(angle);
  return [origin[0]+c*x+s*z,origin[1]-s*x+c*z];
}

function boundsOf(points:Point[]) {
  const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
  return {left:Math.min(...xs),right:Math.max(...xs),bottom:Math.min(...zs),top:Math.max(...zs)};
}

function reefPatch(offset:Point,length:number,width:number,turn:number,bend:number,seed:number) {
  const centerPoint=place(offset,axis,center);
  const base=reefPlatform(Math.PI*length*width/4,width/length,seed,[0,0]);
  const polygon=base.polygon.filter((_,i)=>i%3===0).map(([x,z])=>{
    const tip=z/(length/2);
    const angle=Math.atan2(2*z/length,2*x/width);
    const scallop=.91+.14*Math.sin(3*angle+seed)+.095*Math.cos(5*angle-seed)
      +.19*(noise(x*.13+seed,z*.13)-.5);
    return place([x*scallop*(1-.23*tip)+bend*tip*tip,z*scallop],axis+turn,centerPoint);
  });
  const edges=polygon.map(([x,z],i)=>{
    const next=polygon[(i+1)%polygon.length]!;
    const dx=next[0]-x,dz=next[1]-z;
    return {x,z,dx,dz,endZ:next[1],lengthSquared:dx*dx+dz*dz};
  });
  function distance(x:number,z:number) {
    let inside=false,nearest=Infinity;
    for(const edge of edges){
      const px=x-edge.x,pz=z-edge.z;
      const t=Math.max(0,Math.min(1,(px*edge.dx+pz*edge.dz)/edge.lengthSquared));
      nearest=Math.min(nearest,(px-t*edge.dx)**2+(pz-t*edge.dz)**2);
      if((edge.z>z)!==(edge.endZ>z) && px<pz*edge.dx/edge.dz)inside=!inside;
    }
    return (inside?-1:1)*Math.sqrt(nearest);
  }
  return {center:centerPoint,polygon,bounds:boundsOf(polygon),distance};
}

const patches=[
  reefPatch([3,-91],48,17,.31,8,274),
  reefPatch([-14,-36],55,30,-.36,-9,651),
  reefPatch([24,-12],29,17,.87,3,918),
  reefPatch([6,31],46,33,.28,-7,118),
  reefPatch([-14,88],53,19,-.42,11,706),
];
const vertices=patches.flatMap(patch=>patch.polygon);
export const outerReef={
  center,patches,vertices,bounds:boundsOf(vertices),
  shelfDepth(x:number,z:number){
    const dx=x-center[0],dz=z-center[1];
    const across=Math.cos(axis)*dx-Math.sin(axis)*dz,along=Math.sin(axis)*dx+Math.cos(axis)*dz;
    const bars=noise(x*.052+4,z*.052),grain=noise(x*.16,z*.16+2);
    const spine=9*Math.sin(along*.052)+10*(bars-.5);
    const rim=Math.hypot((across-spine)/37,along/124);
    // A sand shelf links the crests. The deeper cut crosses it obliquely.
    const channel=(along+.65*across+24+12*(bars-.5))/13;
    return 3.3+4.8*bars+1.8*grain+5.7*Math.exp(-channel*channel)
      +34*Math.max(0,rim-.67)**1.65;
  },
  distance(x:number,z:number){
    let nearest=Infinity;
    for(const patch of patches){
      const {left,right,bottom,top}=patch.bounds;
      const outside=Math.max(left-x,x-right,bottom-z,z-top);
      if(outside>0 && outside>=nearest)continue;
      nearest=Math.min(nearest,patch.distance(x,z));
    }
    return nearest;
  },
};

