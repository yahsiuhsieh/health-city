import { Vector4 } from "three";
import { packSeabed } from "../ocean/seabed.ts";
import { clamp01,noise,type IslandTerrain } from "./island-shape.ts";

export function reefProfile(land:IslandTerrain,x:number,z:number) {
  const shore=land.distance(x,z),edge=land.reef.distance(x,z);
  const rough=noise(x*.21+land.seed,z*.21),patch=noise(x*.07,z*.07+land.seed);
  const lee=clamp01((z-land.reef.center[1])/(land.reef.bounds.top-land.reef.center[1]));
  const flatWidth=15+20*patch*(1-.9*lee),crestWidth=4+3*patch;
  let depth:number,rock=0;
  let zone:"toe"|"lagoon"|"flat"|"crest"|"slope"|"sea";
  if(edge>=22){
    zone="sea";depth=22+18*clamp01((edge-22)/5);
  }else if(edge>0){
    zone="slope";
    const a=Math.atan2(z-land.reef.center[1],x-land.reef.center[0]);
    const cycles=Math.round((land.reef.bounds.right-land.reef.bounds.left)*.30);
    const ridges=.5+.5*Math.cos(a*cycles+3.7*noise(x*.033,z*.033+land.seed)+patch);
    const u=edge/22;
    depth=1+21*u+(1.0+.6*patch)*Math.sin(Math.PI*u)*(1-2*ridges);
    rock=.28+.62*ridges;
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
  const r=land.reef.bounds,left=Math.floor(r.left)-30,bottom=Math.floor(r.bottom)-30;
  const width=Math.ceil(r.right-left)+30,height=Math.ceil(r.top-bottom)+30;
  const data=new Float32Array(width*height*4),rock=new Float32Array(width*height),shore=new Float32Array(width*height);
  for(let j=0;j<height;j++)for(let i=0;i<width;i++){
    const n=j*width+i,p=reefProfile(land,left+i+.5,bottom+j+.5);
    data[n*4]=p.depth/40;
    data[n*4+1]=Math.max(-1,Math.min(1,p.shore/24));
    data[n*4+2]=1;
    // The alpha channel carries the broken surf band on the outer lip.
    data[n*4+3]=3*clamp01(1-Math.abs(p.edge+1.7)/2.4)*clamp01((p.patch-.22)*3);
    rock[n]=p.rock;shore[n]=Math.abs(p.shore);
  }
  return packSeabed(new Vector4(left,bottom,width,height),width,height,data,rock,shore,1);
}
