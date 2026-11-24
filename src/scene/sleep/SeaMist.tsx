import { useMemo,useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color,DoubleSide,Group,InstancedMesh,Object3D } from "three";
import { useLayoutEffect } from "react";
import { destination } from "./island-preview.ts";
import { JETTY_HEAD } from "./route.ts";
import { TRANSPARENT_LAYER } from "../ocean/layers.ts";
import { useOcean } from "../ocean/OceanEnvironment.tsx";

export function SeaMist(){
  const ref=useRef<InstancedMesh>(null),group=useRef<Group>(null),ocean=useOcean();
  const uniforms=useMemo(()=>({...ocean.uniforms,dayMist:{value:new Color("#e8f0ec")},nightMist:{value:new Color("#9fb3b8")}}),[ocean]);
  useLayoutEffect(()=>{const dummy=new Object3D();for(let i=0;i<9;i++){
    dummy.position.set(0,.5+i*.31,0);dummy.rotation.set(-Math.PI/2,0,i*2.4);dummy.updateMatrix();ref.current!.setMatrixAt(i,dummy.matrix);
  }ref.current!.instanceMatrix.needsUpdate=true;},[]);
  useFrame(()=>{if(group.current)group.current.visible=uniforms.uRevealS.value>=0 && uniforms.uIslandReveal.value<1;});
  const {reef}=destination();
  return <group ref={group} position={[JETTY_HEAD[0]-15,0,reef.center[1]]} name="Sea mist"><instancedMesh ref={ref} args={[undefined,undefined,9]} layers-mask={1<<TRANSPARENT_LAYER} renderOrder={4}>
    <planeGeometry args={[reef.bounds.right-reef.bounds.left+50,reef.bounds.top-reef.bounds.bottom+45]}/><shaderMaterial uniforms={uniforms} transparent depthWrite={false} side={DoubleSide} forceSinglePass
      vertexShader={`varying vec2 coord;varying float layer;void main(){coord=uv*2.-1.;layer=instanceMatrix[3].y;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`}
      fragmentShader={`uniform float oceanTime,nightAmount,uIslandReveal;uniform vec3 dayMist,nightMist;varying vec2 coord;varying float layer;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.54);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
        void main(){vec2 p=coord*3.+vec2(oceanTime*.035,layer);float n=.65*noise(p)+.35*noise(2.*p);
        float a=(1.-smoothstep(.31,1.,length(coord)+.38*(n-.5)))*mix(.55,.45,nightAmount)*(.10+.40*smoothstep(.3,.8,n))*(1.-uIslandReveal);
        gl_FragColor=vec4(mix(dayMist,nightMist,nightAmount),a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`}/></instancedMesh></group>;
}
