import { DataTexture, LinearFilter, Vector4 } from "three";
import type { SeabedFeature } from "../ocean/seabed.ts";
import { ROUTE_LENGTH, S_MOUTH, routeFrame } from "./route.ts";
import type { SleepSession } from "./session.ts";
import { routeSpans } from "./timeline.ts";
import { seededRandom } from "./random.ts";

import type { IslandTerrain } from "./island-shape.ts";
import { lagoonWeight } from "./island-mesh.ts";

export function waterMap(session: SleepSession,land?:IslandTerrain) {
  const bounds=new Vector4(-10,-50,255,100), width=510,height=200;
  const data=new Uint8Array(width*height*4), nearest=new Float32Array(width*height).fill(Infinity);
  const spans=routeSpans(session);
  for(let s=S_MOUTH;s<=ROUTE_LENGTH-12;s+=.5){
    const span=spans.find(seg=>s>=seg.s0 && s<seg.s1);
    if(!span || span.stage==="ASLEEP")continue;
    const frame=routeFrame(s);
    const row=Math.round((frame.z-bounds.y)*2), col=Math.round((frame.x-bounds.x)*2);
    for(let j=Math.max(0,row-30);j<Math.min(height,row+30);j++){
      for(let i=Math.max(0,col-30);i<Math.min(width,col+30);i++){
        const dx=bounds.x+(i+.5)*.5-frame.x,dz=bounds.y+(j+.5)*.5-frame.z;
        const d=dx*dx+dz*dz, index=j*width+i;
        if(d>=nearest[index]!)continue;
        nearest[index]=d;
        const edge=Math.min(1,(14-Math.sqrt(d))/5,(s-Math.max(S_MOUTH,span.s0))/2,(span.s1-s)/2);
        const k=index*4;data[k]=data[k+1]=data[k+2]=0;
        data[k+(span.stage==="DEEP"?1:span.stage==="REM"?2:0)]=255*Math.max(0,edge);
        data[k+3]=Math.round(s/ROUTE_LENGTH*255);
      }
    }
  }
  if(land){
    for(let j=0;j<height;j++)for(let i=0;i<width;i++){
      const x=bounds.x+(i+.5)*.5,z=bounds.y+(j+.5)*.5;
      if(x<land.left-8||x>land.left+land.width+8||z<land.bottom-8||z>land.bottom+land.height+8)continue;
      const mask=lagoonWeight(land,x,z);if(mask<=0)continue;
      const k=4*(j*width+i);data[k+2]=Math.round(255*mask);data[k+3]=255;
    }
  }
  const texture=new DataTexture(data,width,height);
  texture.minFilter=texture.magFilter=LinearFilter;texture.needsUpdate=true;
  return {bounds,texture};
}
export interface SleepFeature extends SeabedFeature { routeS: number; spanIndex: number }
export function sleepFeatures(session: SleepSession) {
  const features: SleepFeature[]=[];
  for(const span of routeSpans(session)){
    const light=span.stage==="LIGHT", rem=span.stage==="REM";
    if(!light && !rem)continue;
    const rng=seededRandom(session.id,"shelf-"+span.index);
    const start=Math.max(S_MOUTH+5,span.s0), end=Math.min(ROUTE_LENGTH-12,span.s1);
    if(end<=start)continue;
    function add(s:number,side:number,kind:SleepFeature["kind"],rx:number,rz:number,top:number){
      const f=routeFrame(s);
      features.push({kind,x:f.x+side*f.nx,z:f.z+side*f.nz,radiusX:rx,radiusZ:rz,
        yaw:Math.atan2(f.tz,f.tx),top,routeS:s,spanIndex:span.index,revealKey:s/ROUTE_LENGTH,revealGradient:[f.tx/ROUTE_LENGTH,f.tz/ROUTE_LENGTH]});
    }
    // Overlap the submerged shoulders beneath the navigation channel.
    for(let s=start+1;s<end;s+=4) add(s,0,"sandbar",Math.min(11,(end-start)*.73),24+rng()*3,-2.6-.3*rng());
    const count=Math.max(1,Math.round((end-start)/(light?9:5)));
    for(let i=0;i<count;i++){
      const s=start+(i+.35+.25*rng())*(end-start)/count;
      const sides=light?[(i+span.index)%2?1:-1]:[-1,1];
      for(const side of sides) add(s,side*(7+rng()*3),light?"sandbar":"reef",
        light?3+rng()*1.9:3.5+rng(),light?1.45+rng()*.1:2.95+rng()*.5,light?.08+rng()*.07:-1.05);
    }
  }
  return features;
}
