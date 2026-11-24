import type { Point } from "../loop-path.ts";
import { seededRandom } from "./random.ts";
import { PIER_HEAD,ROUTE_LENGTH,routeFrame } from "./route.ts";
import { asleepSeconds,type SleepSession,type SleepStage } from "./session.ts";

export const ISLAND_M2_PER_ASLEEP_MINUTE=2.4;
export const habitats=["LIGHT","DEEP","REM","ASLEEP"] as const;
export type Habitat=typeof habitats[number];
export type IslandCell={x:number;z:number;d:number;y:number;habitat:Habitat};
export function polygonArea(poly:readonly Point[]){
  return Math.abs(poly.reduce((sum,a,i)=>{const b=poly[(i+1)%poly.length]!;return sum+a[0]*b[1]-b[0]*a[1];},0))*.5;
}
export function inside(p:Point,poly:readonly Point[]){
  let hit=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i]!,b=poly[j]!;
    if((a[1]>p[1])!==(b[1]>p[1]) && p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }
  return hit;
}
export function coastDistance(x:number,z:number,poly:readonly Point[]){
  let nearest=Infinity;
  for(let i=0;i<poly.length;i++){
    const a=poly[i]!,b=poly[(i+1)%poly.length]!,dx=b[0]-a[0],dz=b[1]-a[1];
    const u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
    nearest=Math.min(nearest,(x-a[0]-u*dx)**2+(z-a[1]-u*dz)**2);
  }
  return Math.sqrt(nearest);
}
export function stageMinutes(session:SleepSession){
  const totals:Record<SleepStage,number>={LIGHT:0,DEEP:0,REM:0,AWAKE:0,ASLEEP:0};
  for(const span of session.segments)totals[span.stage]+=(span.end-span.start)/60;
  return totals;
}
export function islandShape(session:SleepSession,minutes=asleepSeconds(session)/60){
  if(!(minutes>0))throw new RangeError("Island area requires positive asleep time.");
  const area=minutes*ISLAND_M2_PER_ASLEEP_MINUTE,radius=Math.sqrt(area/Math.PI);
  const random=seededRandom(session.id,"island-shape"),stretch=random()*Math.PI;
  const waves=[.16,.10,.06,.04,.025].map(a=>[a*(.7+.3*random())*(minutes<60?.5:1),random()*Math.PI*2] as const);
  const f=routeFrame(ROUTE_LENGTH),pierAngle=Math.atan2(-f.tz,-f.tx),tau=Math.PI*2;
  const cove=pierAngle+100*Math.PI/180;
  const delta=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  const poly:Point[]=Array.from({length:256},(_,i)=>{
    const a=pierAngle+i*tau/256;
    const harmonic=waves.reduce((r,[amp,phase],k)=>r+amp*Math.cos((k+2)*a+phase),1);
    const ellipse=1/Math.hypot(Math.cos(a-stretch)/1.35,Math.sin(a-stretch));
    const bay=radius<6?0:.22*Math.exp(-(delta(a,pierAngle)**2)/.07);
    const inlet=radius<6?0:.12*Math.exp(-(delta(a,cove)**2)/.14);
    const r=radius*Math.max(.45,harmonic*ellipse*(1-bay-inlet));
    return [Math.cos(a)*r,Math.sin(a)*r];
  });
  const scale=Math.sqrt(area/polygonArea(poly));
  // Leave a hull-width berth alongside the pier.
  const pier:Point=[PIER_HEAD[0]+f.nx*3.75,PIER_HEAD[1]+f.nz*3.75];
  const shore:Point=[pier[0]+6*f.tx,pier[1]+6*f.tz];
  const center:Point=[shore[0]-poly[0]![0]*scale,shore[1]-poly[0]![1]*scale];
  // Reserve the fairway before growing the far side to recover the exact land area.
  const approach=routeFrame(ROUTE_LENGTH-20);
  const clearances=[[approach.x,approach.z,25.08],[PIER_HEAD[0]+6.7*f.tx,PIER_HEAD[1]+6.7*f.tz,2.65]];
  const radii=poly.map(([x,z])=>{
    const original=Math.hypot(x,z),ux=x/original,uz=z/original;
    let length=original*scale;
    for(const [cx,cz,keep] of clearances){
      const dx=cx!-center[0],dz=cz!-center[1],along=dx*ux+dz*uz;
      const disc=keep!**2-(dx*uz-dz*ux)**2;
      if(along>0 && disc>0)length=Math.min(length,along-Math.sqrt(disc));
    }
    return {ux,uz,length,weight:Math.max(0,ux*f.tx+uz*f.tz)**2};
  });
  const outline=(growth:number):Point[]=>radii.map(({ux,uz,length,weight})=>{
    const r=length*(1+growth*weight);return [center[0]+ux*r,center[1]+uz*r];
  });
  let low=0,high=1;
  while(polygonArea(outline(high))<area)high*=2;
  for(let i=0;i<38;i++){const mid=(low+high)/2;if(polygonArea(outline(mid))<area)low=mid;else high=mid;}
  const polygon=outline((low+high)/2);
  polygon[0]=shore;
  return {area,radius,polygon,center,shore,pier,cove,f};
}
export type IslandShape=ReturnType<typeof islandShape>;
export function islandTerrain(session:SleepSession,minutes?:number){
  const shape=islandShape(session,minutes),{polygon,center,radius}=shape;
  const xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1]);
  const left=Math.floor(Math.min(...xs)),bottom=Math.floor(Math.min(...zs));
  const width=Math.ceil(Math.max(...xs))-left,height=Math.ceil(Math.max(...zs))-bottom;
  const grid=new Map<number,IslandCell>(),cells:IslandCell[]=[];
  const key=(x:number,z:number)=>Math.floor((x-left)*2)+Math.floor((z-bottom)*2)*(width*2+4);
  let maxD=0;
  for(let z=bottom+.25;z<bottom+height;z+=.5)for(let x=left+.25;x<left+width;x+=.5){
    if(!inside([x,z],polygon))continue;
    const d=coastDistance(x,z,polygon),cell:IslandCell={x,z,d,y:0,habitat:"LIGHT"};
    maxD=Math.max(maxD,d);cells.push(cell);grid.set(key(x,z),cell);
  }
  const hmax=Math.max(1.2,Math.min(8,.28*radius)),noise=seededRandom(session.id,"terrain")()*12;
  function elevation(x:number,z:number,d:number){
    if(d<.0001)return 0;
    const a=(x-center[0])/radius,b=(z-center[1])/radius;
    const n=.52*Math.sin(a*4+noise)*Math.cos(b*3)+.29*Math.cos(8*a+5*b)+.18*Math.sin(11*b-4*a);
    const t=Math.min(1,d/Math.max(.1,maxD)),h=hmax*(t**.8+.18*n*Math.min(1,t*3));
    const beach=.14*d,u=Math.max(0,Math.min(1,(d-2.5)/2.7));
    return beach+(h-beach)*u*u*(3-2*u);
  }
  for(const p of cells)p.y=elevation(p.x,p.z,p.d);
  const totals=stageMinutes(session),total=asleepSeconds(session)/60;
  const priority=(p:IslandCell)=>{
    const a=Math.atan2(p.z-center[1],p.x-center[0])-shape.cove;
    return (p.d>.35*radius?10000:0)+radius*Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))+1.5*p.d;
  };
  const ordered=[...cells].sort((a,b)=>priority(a)-priority(b));
  let cursor=0;
  for(const stage of ["REM","DEEP","ASLEEP"] as const){
    if(stage==="DEEP"){const rest=ordered.slice(cursor).sort((a,b)=>b.y-a.y);for(let i=0;i<rest.length;i++)ordered[cursor+i]=rest[i]!;}
    const count=Math.round(cells.length*totals[stage]/total);
    for(const p of ordered.slice(cursor,cursor+count))p.habitat=stage;
    cursor+=count;
  }
  function cellAt(x:number,z:number){return grid.get(key(x,z));}
  const pools:{x:number;z:number;level:number;rx:number;rz:number;yaw:number}[]=[];
  const random=seededRandom(session.id,"tide-pools");
  const coveCells=cells.filter(p=>p.habitat==="REM"),count=Math.round(coveCells.length*.25/30);
  const sites=coveCells.filter(p=>p.d>1.3 && p.d<3.9);
  for(let i=0;i<sites.length && pools.length<count;i++){
    const j=i+Math.floor(random()*(sites.length-i));[sites[j],sites[i]]=[sites[i]!,sites[j]!];
    const p=sites[i]!;if(pools.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<2.7))continue;
    pools.push({x:p.x,z:p.z,level:Math.max(.045,p.y-.22),rx:.78+random()*.53,rz:.45+random()*.28,yaw:random()*Math.PI});
  }
  function surfaceHeight(x:number,z:number,d:number){
    const h=elevation(x,z,d);
    for(const p of pools){const dx=x-p.x,dz=z-p.z,c=Math.cos(p.yaw),s=Math.sin(p.yaw);
      const r=Math.hypot((c*dx-s*dz)/p.rx,(s*dx+c*dz)/p.rz);
      if(r<1.55){const u=Math.max(0,Math.min(1,(r-.55)));return p.level-.08+(h-p.level+.08)*u*u*(3-2*u);}
    }
    return h;
  }
  return {...shape,left,bottom,width,height,cells,cellAt,pools,elevation:surfaceHeight};
}
export type IslandTerrain=ReturnType<typeof islandTerrain>;
