import { seededRandom } from "./random.ts";
import { outerReef, outerReefScale } from "./outer-reef.ts";
import { Vector4 } from "three";
import { packSeabed } from "../ocean/seabed.ts";
import { clamp01,noise,islandNoisePoint,type IslandTerrain } from "./island-shape.ts";

type Spur={x:number;z:number;nx:number;nz:number;length:number;width:number};
const spurs=new WeakMap<IslandTerrain,Spur[]>();
function spurRelief(land:IslandTerrain,x:number,z:number){
  let field=spurs.get(land);
  if(!field){
    const random=seededRandom(String(land.seed),"reef-spurs"),outline=land.reef.polygon;
    field=[];let next=0;
    for(const [i,a] of outline.entries()){
      const b=outline[(i+1)%outline.length]!,dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
      while(next<len){
        field.push({x:a[0]+dx*next/len,z:a[1]+dz*next/len,nx:dz/len,nz:-dx/len,length:6+12*random(),width:1.7+1.9*random()});
        next+=5+9*random();
      }
      next-=len;
    }
    spurs.set(land,field);
  }
  let ridge=0;
  for(const spur of field){
    const dx=x-spur.x,dz=z-spur.z;
    if(Math.abs(dx)>21 || Math.abs(dz)>21)continue;
    const along=(dx*spur.nx+dz*spur.nz)/spur.length,across=(dz*spur.nx-dx*spur.nz)/spur.width;
    if(along>=0 && along<1)ridge=Math.max(ridge,(1-along*along)*Math.exp(-across*across));
  }
  return ridge;
}

export function reefProfile(land:IslandTerrain,x:number,z:number) {
  const shore=land.distance(x,z),edge=land.reef.distance(x,z);
  const [u,v]=islandNoisePoint(x,z);
  const rough=noise(u*.21+land.seed,v*.21),patch=noise(u*.07,v*.07+land.seed);
  const lee=clamp01((z-land.reef.center[1])/(land.reef.bounds.top-land.reef.center[1]));
  const flatWidth=15+20*patch*(1-.9*lee),crestWidth=4+3*patch;
  let depth:number,rock=0;
  let zone:"toe"|"lagoon"|"flat"|"crest"|"slope"|"sea";
  if(edge>=22){
    zone="sea";depth=22+18*clamp01((edge-22)/5);
  }else if(edge>0){
    zone="slope";
    const ridges=spurRelief(land,x,z),u=edge/22;
    depth=1+21*u-3*Math.sin(Math.PI*u)*ridges;
    rock=.22+.65*ridges;
  }else if(shore<6){
    zone="toe";depth=.8*clamp01(shore/6);
  }else if(edge>=-crestWidth){
    zone="crest";depth=.2+.4*rough;rock=.65+.34*patch;
  }else if(edge>=-flatWidth && shore>9){
    zone="flat";depth=.4+.8*rough;rock=.25+.72*patch;
  }else{
    zone="lagoon";depth=.8+clamp01((shore-6)/7)*(.44+1.26*patch);
    rock=.46*clamp01((patch-.57)*4);
  }
  return {shore,edge,depth,rock,zone,rough,patch};
}
export function islandSeabed(land:IslandTerrain){
  return platformBed(land.reef.bounds,(x,z)=>reefProfile(land,x,z),1);
}

export function outerReefSeabed(){
  return platformBed(outerReef.bounds,(x,z)=>{
    const edge=outerReef.distance(x,z);
    const broad=noise(x*.062,z*.062),rough=noise(x*.18+19,z*.18);
    const coral=clamp01(2.4*(broad-.31)+.85*(rough-.5));
    const cover=clamp01(.6-edge/14);
    const relief=.35+.75*rough+1.75*(1-coral);
    const slope=Math.max(0,edge)/outerReefScale*(.68+.69*broad);
    const shelf=Math.min(40,outerReef.shelfDepth(x,z),relief+slope);
    const drop=clamp01((edge-20)/18);
    const depth=shelf+(40-shelf)*drop*drop*(3-2*drop);
    const colonies=noise(x*.24+2*broad,z*.24+rough);
    const rock=.08+.91*cover*clamp01(.48*coral+2.4*(colonies-.27));
    return {edge,shore:40,depth,rock,patch:cover*coral*.68};
  },0);
}

type Profile=Pick<ReturnType<typeof reefProfile>,"edge"|"shore"|"patch"|"depth"|"rock">;
function platformBed(r:IslandTerrain["bounds"],profile:(x:number,z:number)=>Profile,reveal:number){
  const left=Math.floor(r.left)-42,bottom=Math.floor(r.bottom)-42;
  const width=Math.ceil(r.right-left)+42,height=Math.ceil(r.top-bottom)+42;
  const data=new Float32Array(width*height*4),rock=new Float32Array(width*height),shore=new Float32Array(width*height);
  for(let j=0;j<height;j++)for(let i=0;i<width;i++){
    const n=j*width+i,p=profile(left+i+.5,bottom+j+.5);
    data[n*4]=p.depth/40;
    data[n*4+1]=Math.max(-1,Math.min(1,p.shore/24));
    data[n*4+2]=reveal;
    // The alpha channel carries the broken surf band on the outer lip.
    data[n*4+3]=3*clamp01(1-Math.abs(p.edge+1.7)/2.4)*clamp01((p.patch-.22)*3);
    rock[n]=p.rock;shore[n]=Math.abs(p.shore);
  }
  return packSeabed(new Vector4(left,bottom,width,height),width,height,data,rock,shore,1);
}
