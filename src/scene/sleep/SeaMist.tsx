import { useMemo,useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color,DoubleSide,Group } from "three";
import { driftingMistGLSL } from "./mist-bank.ts";
import { TRANSPARENT_LAYER } from "../ocean/layers.ts";
import { useOcean } from "../ocean/OceanEnvironment.tsx";
import { waveFrontGLSL } from "../ocean/shore-shader.ts";

export function SeaMist(){
  const group=useRef<Group>(null),ocean=useOcean();
  const bank=useMemo(()=>{
    const {center,halfX,halfZ,uniforms}=ocean.mist!;
    return {center,halfX,halfZ,uniforms:{...ocean.uniforms,...uniforms,
      dayMist:{value:new Color("#bad2d3")},nightMist:{value:new Color("#8198a4")}}};
  },[ocean]);
  useFrame(()=>{group.current!.visible=ocean.uniforms.uIslandReveal.value<1;});
  return <group ref={group} name="Sea mist" position={[bank.center[0],0,bank.center[1]]}>
    <mesh position-y={1.5} rotation-x={-Math.PI/2} layers-mask={1<<TRANSPARENT_LAYER} renderOrder={4}>
      <planeGeometry args={[bank.halfX*2,bank.halfZ*2]}/><shaderMaterial uniforms={bank.uniforms} transparent depthWrite={false} side={DoubleSide} forceSinglePass
      vertexShader={`varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;
        gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`}
      fragmentShader={`uniform float oceanTime,nightAmount,uIslandReveal;
        uniform vec3 dayMist,nightMist;varying vec3 world;
        ${waveFrontGLSL}
        ${driftingMistGLSL}
        void main(){
          float a=driftingMist(world.xz);
          gl_FragColor=vec4(mix(dayMist,nightMist,nightAmount),a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`}/></mesh></group>;
}
