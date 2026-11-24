import { useEffect,useMemo,useRef } from "react";
import { useFrame,useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Group,InstancedMesh,Mesh,MeshStandardMaterial,Object3D } from "three";
import type { Replay } from "../../core/replay.ts";
import { DRY_LAYER,SEABED_LAYER } from "../ocean/layers.ts";
import { ambientTime } from "../ocean/ambient-time.ts";
import { routeFrame } from "./route.ts";
import { SYNTHETIC_SESSION as session } from "./session.ts";
import { routeSpans,routeDistanceAt } from "./timeline.ts";
import { companionState } from "./vessel-state.ts";

export function VoyageLife({offset,replay,night,overview,onWake}:{offset:number;replay:Replay;night:boolean;overview:boolean;onWake:()=>void}){
  const [world,life]=useLoader(GLTFLoader,["/models/sleep-world.glb","/models/sea-life.glb"]);
  const buoy=useMemo(()=>{const obj=world!.scene.getObjectByName("wake-buoy")!.clone(true);
    const lens=obj.getObjectByName("wake-buoy-lens") as Mesh;lens.material=(lens.material as MeshStandardMaterial).clone();
    lens.layers.set(DRY_LAYER);obj.getObjectByName("wake-buoy-topmark")!.layers.set(DRY_LAYER);
    const lamp=lens.material as MeshStandardMaterial;lamp.emissive.set("#ffc46b");return {obj,lamp};},[world]);
  useEffect(()=>()=>buoy.lamp.dispose(),[buoy]);
  const animals=useMemo(()=>{const obj=life!.scene.clone(true);
    for(const name of ["fish-a","fish-b"])obj.getObjectByName(name)!.visible=false;return obj;},[life]);
  const schools=useMemo(()=>["fish-a","fish-b"].map(name=>{
    const asset=animals.getObjectByName(name) as Mesh;
    const mesh=new InstancedMesh(asset.geometry,asset.material,8);mesh.name="REM school "+name;mesh.layers.set(SEABED_LAYER);mesh.frustumCulled=false;
    return mesh;
  }),[animals]);
  const swimmer=useMemo(()=>new Object3D(),[]);
  useEffect(()=>()=>schools.forEach(s=>s.dispose()),[schools]);
  const spout=useRef<Group>(null);
  const wake=routeSpans(session).find(s=>s.stage==="AWAKE")!,marker=routeFrame(wake.s0);
  useFrame(()=>{
    const seconds=replay.read().seconds,t=seconds+offset,a=ambientTime(seconds),phase=a+marker.x*.31;
    buoy.obj.visible=t>=wake.start;
    buoy.obj.position.set(marker.x+marker.nx*3,.06*Math.sin(phase*2.2),marker.z+marker.nz*3);
    buoy.obj.rotation.set(.045*Math.cos(phase),marker.yaw,.068*Math.sin(phase*.92));buoy.obj.scale.setScalar(overview?.6:1);
    buoy.lamp.emissiveIntensity=overview||!night?.3:a%4<.6?1.8:.08;
    const state=companionState(session,t,seconds),frame=routeFrame(routeDistanceAt(session,t));
    for(const kind of ["ray","whale","shark"] as const){
      const o=animals.getObjectByName(kind)!;o.visible=!!state && kind===state.kind && state.fade>0;
      if(!state||!o.visible)continue;
      const d=state.side*state.across;
      o.position.set(frame.x+frame.nx*d-frame.tx*1.7,state.height-(1-state.fade)*2,frame.z+frame.nz*d-frame.tz*1.7);
      o.rotation.y=frame.yaw;
      if(kind==="ray"){
        o.getObjectByName("ray-wing-left")!.rotation.x=state.wing;o.getObjectByName("ray-wing-right")!.rotation.x=-state.wing;
        o.getObjectByName("ray-tail")!.rotation.y=state.tail;
      }else if(kind==="shark")o.getObjectByName("shark-tail")!.rotation.y=state.tail;
      else{
        o.rotation.z=.17*Math.sin(state.cycle*Math.PI*2/3)*state.surface;
        o.getObjectByName("whale-flukes")!.rotation.z=-.34*state.surface;
      }
    }
    for(const [index,school] of schools.entries()){
      school.visible=!!state&&state.fade>0;
      if(!state)continue;
      for(let i=0;i<school.count;i++){
        const angle=a*.7+i*2.4+index,side=index?-1:1;
        const d=side*(6+.9*Math.cos(angle)),along=.63*(i-4)+1.1*Math.sin(angle);
        swimmer.position.set(frame.x+frame.nx*d+frame.tx*along,-.68-.28*Math.sin(angle*.71)-(1-state.fade)*2,frame.z+frame.nz*d+frame.tz*along);
        swimmer.rotation.y=frame.yaw+.5*Math.cos(angle);swimmer.scale.setScalar(.67+.18*(i%3));swimmer.updateMatrix();school.setMatrixAt(i,swimmer.matrix);
      }
      school.instanceMatrix.needsUpdate=true;
    }
    if(spout.current){
      const whale=animals.getObjectByName("whale")!;
      const u=((state?.cycle??0)-.95)/1.2;
      spout.current.visible=state?.kind==="whale"&&u>0&&u<1;
      spout.current.position.copy(whale.position);spout.current.position.y+=.86+u*1.5;
      spout.current.scale.setScalar(Math.max(0,Math.sin(Math.PI*u))*.8);
    }
  });
  return <><primitive object={buoy.obj} onClick={(e:import("@react-three/fiber").ThreeEvent<MouseEvent>)=>{if(buoy.obj.visible&&e.delta<5){e.stopPropagation();onWake();}}}/>
    <primitive object={animals}/>{schools.map(s=><primitive key={s.uuid} object={s} dispose={null}/>)}<group ref={spout}>{[-1,0,1].map(i=><mesh key={i} position={[i*.25,Math.abs(i)*.27,0]} rotation-z={i*-.32} scale={[.19,.62,.21]}><sphereGeometry args={[1,8,6]}/><meshBasicMaterial color="#e9f5ed" transparent opacity={.68} depthWrite={false}/></mesh>)}</group></>;
}
