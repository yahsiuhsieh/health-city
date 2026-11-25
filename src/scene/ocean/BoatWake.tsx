import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, Color, DoubleSide, DynamicDrawUsage, Float32BufferAttribute,
  Mesh, ShaderMaterial } from "three";
import type { Replay } from "../../core/replay.ts";
import { TRANSPARENT_LAYER, WATER_LEVEL } from "./layers.ts";
import { useOcean } from "./OceanEnvironment.tsx";
import { noiseGLSL } from "./shore-shader.ts";
import { TRAIL_LENGTH } from "./wake.ts";
import type { WakeSource, WakeSample } from "./wake.ts";

const rows=TRAIL_LENGTH+1;
const extras=rows*2;
function ribbonGeometry() {
  const geometry=new BufferGeometry(), indices:number[]=[], coordinates:number[]=[];
  for(let i=0;i<rows;i++) {
    coordinates.push(-1,i,0, 1,i,0);
    if(i<rows-1) {
      const n=i*2;
      indices.push(n,n+1,n+2,n+2,n+1,n+3);
    }
  }
  // Two bow crescents and the two Kelvin arms share the ribbon draw call.
  for(let i=0;i<4;i++) {
    const n=extras+i*4, kind=i<2?1:2;
    coordinates.push(-1,0,kind,1,0,kind,-1,1,kind,1,1,kind);
    indices.push(n,n+1,n+2,n+2,n+1,n+3);
  }
  geometry.setAttribute("position",new Float32BufferAttribute(new Float32Array(coordinates.length),3).setUsage(DynamicDrawUsage));
  geometry.setAttribute("wakeCoord",new Float32BufferAttribute(coordinates,3));
  geometry.setIndex(indices);
  return geometry;
}
function positionRibbon(geometry:BufferGeometry,sample:WakeSample) {
  const pos=geometry.getAttribute("position"), {points,beam}=sample;
  for(let i=0;i<rows;i++) {
    const p=points[Math.min(i,points.length-1)]!;
    const a=points[Math.min(Math.max(0,i-1),points.length-2)]!, b=points[Math.min(i+1,points.length-1)]!;
    const dx=b.x-a.x, dz=b.z-a.z, length=Math.hypot(dx,dz)||1;
    const half=beam*(.9+1.3*p.behind/TRAIL_LENGTH)*.5;
    for(const [j,sign] of [-1,1].entries()) {
      pos.setXYZ(i*2+j,p.x-sign*dz/length*half,WATER_LEVEL+.012,p.z+sign*dx/length*half);
    }
  }
  const stern=points[0]!, next=points[1]!;
  const yaw=sample.yaw??-Math.atan2(stern.z-next.z,stern.x-next.x);
  const dx=Math.cos(yaw), dz=-Math.sin(yaw);
  for(let i=0;i<4;i++) {
    const sign=i%2?1:-1, bow=i<2;
    for(let j=0;j<4;j++) {
      const t=Math.floor(j/2), side=j%2?1:-1;
      const along=bow?19.1-3.4*t:-14*t;
      const across=sign*(bow?.38+beam*.26*t:beam*.37+14*t*Math.tan(19.5*Math.PI/180))+side*(bow?.34:.30);
      pos.setXYZ(extras+i*4+j,stern.x+along*dx-across*dz,WATER_LEVEL+.014,stern.z+along*dz+across*dx);
    }
  }
  pos.needsUpdate=true;
}
const vertexShader=`
  attribute vec3 wakeCoord;
  varying vec3 coord;
  varying vec2 waterPoint;
  void main(){
    coord=wakeCoord; waterPoint=position.xz;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
  }
`;
const fragmentShader=`
  uniform vec3 foam;
  uniform float strength, stopped, night, deep, rem, oceanTime;
  uniform vec3 plankton;
  varying vec3 coord;
  varying vec2 waterPoint;
  ${noiseGLSL}
  void main(){
    float t=coord.y, side=abs(coord.x), alpha;
    vec3 color=foam;
    float grain=oceanNoise(waterPoint*2.5);
    if(coord.z<.5){
      vec2 p=waterPoint + .18*vec2(sin(oceanTime+t*.32),cos(oceanTime*.7+t*.4)) + .5*vec2(oceanNoise(waterPoint*.7),oceanNoise(waterPoint*.8+7.));
      float field=.68*oceanNoise(p*1.12)+.32*grain;
      float width=.92+.06*(1.-exp(-t/9.))+.12*(grain-.5);
      float edge=1.-smoothstep(width*.42,width,side);
      float bubbles=smoothstep(.21,.68,field+.18*sin(t*1.1+coord.x*5.+oceanTime));
      float origin=smoothstep(-.3,1.8,t-(side*side)*2.);
      alpha=origin*edge*bubbles*(.46+.52*lace(p))*exp(-t/mix(20.,27.,deep))*(1.-smoothstep(47.,55.,t));

    } else if(coord.z<1.5){
      float crest=abs(coord.x-.55*sin(t*3.14159));
      alpha=.6*(1.-smoothstep(.05,.65,crest))*sin(t*3.14159);
    } else {
      alpha=.12*(1.-smoothstep(.1,.85,side))*(1.-t)*(.45+.55*grain);
    }
    vec2 cell=floor(waterPoint*11.);
    float seed=fract(sin(dot(cell,vec2(37.2,91.8)))*4375.31);
    float pulse=smoothstep(.36,.95,sin(oceanTime*9.+seed*24.));
    float dotMask=1.-smoothstep(.15,.46,length(fract(waterPoint*11.)-.5));
    float range=coord.z<.5?1.-smoothstep(1.,6.,t):coord.z<1.5?1.:1.-smoothstep(0.,6./14.,t);
    float sparkle=rem*night*range*dotMask*step(.56,seed)*pulse;
    color=mix(color,plankton,sparkle);
    float trail=coord.z<.5?clamp(t/55.,0.,1.):0.;
    float fade=stopped>.5?1.-smoothstep(.50*trail,.50+.50*trail,1.-strength):strength;
    gl_FragColor=vec4(color,max(alpha*mix(1.,.55,night),sparkle)*fade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function BoatWake({source,replay,night}:{source:WakeSource;replay:Replay;night:boolean}) {
  const ocean=useOcean();
  const lastTime=useRef<number>(NaN);
  const wake=useMemo(()=>{
    const uniforms={foam:{value:new Color()},strength:{value:0},stopped:{value:0},night:ocean.uniforms.nightAmount,oceanTime:ocean.uniforms.oceanTime,plankton:{value:new Color("#4fe3c1")},deep:{value:0},rem:{value:0}};
    const material=new ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false,side:DoubleSide,forceSinglePass:true});
    const mesh=new Mesh(ribbonGeometry(),material);
    mesh.name="Boat wake"; mesh.layers.set(TRANSPARENT_LAYER); mesh.frustumCulled=false;
    mesh.visible=false;
    return {mesh,uniforms};
  },[ocean]);
  useEffect(()=>{ lastTime.current=NaN; },[source,replay]);
  useEffect(()=>()=>{wake.mesh.material.dispose();wake.mesh.geometry.dispose();},[wake]);
  useFrame(()=>{
    const seconds=replay.read().seconds, moved=seconds!==lastTime.current;
    if(moved){
      const sample=source.sample(seconds);
      lastTime.current=seconds;
      wake.mesh.visible=sample.strength>0 && sample.points.length>1;
      wake.uniforms.strength.value=wake.mesh.visible?sample.strength:0;
      wake.uniforms.stopped.value=Number(sample.stopped);
      wake.uniforms.deep.value=Number(sample.stage==="DEEP");
      wake.uniforms.rem.value=Number(sample.stage==="REM");
      if(wake.mesh.visible) positionRibbon(wake.mesh.geometry,sample);
    }
    if(!wake.mesh.visible) return;
    wake.uniforms.foam.value.set(night?"#9fb6bf":"#f2f8fa");

  });
  return <primitive object={wake.mesh} dispose={null}/>;
}
