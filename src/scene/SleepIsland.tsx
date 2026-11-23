import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group } from "three";
import type { Replay } from "../core/replay.ts";
import { voyage, wake } from "./sleep-voyage.ts";
import { PIER_HEAD, routeFrame } from "./sleep/route.ts";
import { routeDistanceAt } from "./sleep/timeline.ts";
import { SYNTHETIC_SESSION } from "./sleep/session.ts";
export function SleepIsland({offset,replay,onWake}:{offset:number;replay:Replay;onWake:()=>void}){
  const buoy=useRef<Group>(null),pier=useRef<Group>(null),ray=useRef<Group>(null);
  const wings=useRef<Group>(null);
  const marker=routeFrame(routeDistanceAt(SYNTHETIC_SESSION,wake.start));
  const rayShape=useMemo(()=>{
    const g=new BufferGeometry();
    g.setAttribute("position",new Float32BufferAttribute([0,.14,.78,-1.28,0,-.4,0,.08,-.56,0,.14,.78,0,.08,-.56,1.28,0,-.4,0,.08,-.56,-.08,.04,-.48,.05,0,-1.65],3));
    g.computeVertexNormals();return g;
  },[]);
  useEffect(()=>()=>{rayShape.dispose()},[rayShape]);
  useFrame(()=>{
    const state=voyage(offset,replay.read().seconds);
    if(buoy.current)buoy.current.visible=state.t>=wake.start;
    if(pier.current)pier.current.visible=state.progress===1;
    if(ray.current && wings.current){
      ray.current.visible=state.stage==="REM";
      const phase=state.t/80;
      ray.current.position.set(state.x+3.4*Math.sin(state.yaw),.31+.09*Math.sin(phase),state.z+3.4*Math.cos(state.yaw));
      ray.current.rotation.y=state.yaw+Math.PI/2;
      wings.current.scale.y=1+.6*Math.sin(phase);
      wings.current.rotation.z=.12*Math.sin(phase);
    }
  });
  return <group name="Sleep island">
    <group ref={pier} position={[PIER_HEAD[0]+4,0,PIER_HEAD[1]+3.5]}>
      <mesh position={[18,-.9,0]} scale={[18,3.3,14]}><sphereGeometry args={[1,32,10]}/><meshStandardMaterial color="#93a870" flatShading/></mesh>
      <mesh position-y={.55}><boxGeometry args={[3.5,.28,2.4]}/><meshStandardMaterial color="#aa8861"/></mesh>
      {[-1,1].map(z=><mesh key={z} position={[-1.6,.18,z]}><cylinderGeometry args={[.13,.14,1.5,8]}/><meshStandardMaterial color="#755e46"/></mesh>)}
    </group>
    <group ref={buoy} name="Awakening buoy" position={[marker.x+3*Math.sin(marker.yaw),0,marker.z+3*Math.cos(marker.yaw)]} onClick={e=>{if(e.delta<=4){e.stopPropagation();onWake()}}}>
      <mesh position-y={.34}><coneGeometry args={[.52,.8,10]}/><meshStandardMaterial color="#ce7341"/></mesh>
      <mesh position-y={.97}><cylinderGeometry args={[.08,.12,.8,10]}/><meshStandardMaterial color="#f2dbac"/></mesh>
      <mesh position-y={1.45}><sphereGeometry args={[.18,10,8]}/><meshStandardMaterial color="#f9dfa3" emissive="#ffbe56" emissiveIntensity={.6}/></mesh>
    </group>
    <group ref={ray} name="Sleep ray"><mesh position-y={.07} scale={[.35,.15,.81]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#456f79"/></mesh>{[-1,1].map(side=><mesh key={side} position={[side*.18,.18,.4]}><sphereGeometry args={[.068,7,5]}/><meshStandardMaterial color="#283d41"/></mesh>)}<group ref={wings}><mesh geometry={rayShape}><meshStandardMaterial color="#426f78" side={DoubleSide}/></mesh></group></group>
  </group>;
}
