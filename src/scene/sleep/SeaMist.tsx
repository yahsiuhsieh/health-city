import { useEffect,useMemo,useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color,DataTexture,DoubleSide,Group,LinearFilter,RedFormat,Vector2,Vector3 } from "three";
import type { IslandTerrain } from "./island-shape.ts";
import { mistBank } from "./mist-bank.ts";
import { TRANSPARENT_LAYER } from "../ocean/layers.ts";
import { useOcean } from "../ocean/OceanEnvironment.tsx";
import { noiseGLSL } from "../ocean/shore-shader.ts";

export function SeaMist({land}:{land:IslandTerrain}){
  const group=useRef<Group>(null),ocean=useOcean();
  const bank=useMemo(()=>{
    const {center,halfX,halfZ,density,patches}=mistBank(land);
    const width=Math.ceil(halfX),height=Math.ceil(halfZ),data=new Uint8Array(width*height);
    for(let j=0;j<height;j++)for(let i=0;i<width;i++){
      const x=center[0]+((i+.5)/width*2-1)*halfX,z=center[1]+(1-(j+.5)/height*2)*halfZ;
      data[j*width+i]=Math.round(255*density(x,z));
    }
    const mask=new DataTexture(data,width,height,RedFormat);
    mask.unpackAlignment=1;mask.magFilter=mask.minFilter=LinearFilter;mask.needsUpdate=true;
    return {center,halfX,halfZ,mask,uniforms:{...ocean.uniforms,bankMask:{value:mask},
      patches:{value:patches.map(p=>new Vector3(p.x,p.z,p.radius))},jetty:{value:new Vector2(...land.pier)},
      reach:{value:Math.max(...land.reef.polygon.map(([x,z])=>Math.hypot(x-land.pier[0],z-land.pier[1])))},
      dayMist:{value:new Color("#e4efed")},nightMist:{value:new Color("#9fb3b8")}}};
  },[land,ocean]);
  useEffect(()=>()=>bank.mask.dispose(),[bank]);
  useFrame(()=>{group.current!.visible=ocean.uniforms.uRevealS.value>=0 && ocean.uniforms.uIslandReveal.value<1;});
  return <group ref={group} name="Sea mist" position={[bank.center[0],0,bank.center[1]]}>
    {[2.5,5.5,8.5].map(h=><mesh key={h} position-y={h} rotation-x={-Math.PI/2} layers-mask={1<<TRANSPARENT_LAYER} renderOrder={4}>
      <planeGeometry args={[bank.halfX*2,bank.halfZ*2]}/><shaderMaterial uniforms={bank.uniforms} transparent depthWrite={false} side={DoubleSide} forceSinglePass
      vertexShader={`varying vec2 coord;varying vec3 world;void main(){coord=uv;world=(modelMatrix*vec4(position,1.)).xyz;
        gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`}
      fragmentShader={`uniform float oceanTime,nightAmount,uIslandReveal,reach;uniform sampler2D bankMask;
        uniform vec2 jetty;uniform vec3 patches[12],dayMist,nightMist;varying vec2 coord;varying vec3 world;
        ${noiseGLSL}
        void main(){
          vec2 p=world.xz;vec2 drift=vec2(.65,.33)*oceanTime;float layer=world.y;
          float cloud=.65*oceanNoise((p-drift)*.046+layer*.29)+.35*oceanNoise((p-drift)*.102-layer*.13);
          float density=texture2D(bankMask,coord+.013*(cloud-.5)).r;
          float billows=0.;for(int i=0;i<12;i++){vec3 cloudPatch=patches[i];
            vec2 offset=4.*vec2(sin(oceanTime*.12+float(i)),cos(oceanTime*.09+float(i)));
            billows+=1.-smoothstep(.12,1.,length(p-cloudPatch.xy-offset)/cloudPatch.z);}
          float delay=.46*clamp(distance(p,jetty)/reach,0.,1.);
          float reveal=smoothstep(delay,delay+.54,uIslandReveal);
          float a=density*(1.-reveal)*clamp(.23+.53*cloud+.18*billows,0.,.85);
          gl_FragColor=vec4(mix(dayMist,nightMist,nightAmount)*(.9+.12*cloud),a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`}/></mesh>)}</group>;
}
