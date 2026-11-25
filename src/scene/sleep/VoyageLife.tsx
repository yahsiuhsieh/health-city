import { useEffect,useMemo } from "react";
import { useFrame,useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Mesh,MeshStandardMaterial } from "three";
import type { Replay } from "../../core/replay.ts";
import { DRY_LAYER } from "../ocean/layers.ts";
import { ambientTime } from "../ocean/ambient-time.ts";
import { routeFrame } from "./route.ts";
import type { DaySleepVoyage, SleepSpan } from "./session.ts";
import type { IslandTerrain } from "./island-shape.ts";
import { routeSpans } from "./timeline.ts";
import { wildlifeRig } from "./wildlife-render.ts";
import { useOcean } from "../ocean/OceanEnvironment.tsx";

export function VoyageLife({sleep,land,replay,night,onWake}:{
  sleep:DaySleepVoyage; land:IslandTerrain|null; replay:Replay; night:boolean; onWake:(span:SleepSpan)=>void;
}){
  const {session,offset}=sleep;
  const [world,life]=useLoader(GLTFLoader,["/models/sleep-world.glb","/models/sea-life.glb"]);
  const buoys=useMemo(()=>routeSpans(session).filter(span=>span.stage==="AWAKE").map(span=>{
    const obj=world!.scene.getObjectByName("wake-buoy")!.clone(true);
    obj.visible=false;
    obj.scale.y=1.35;
    const lens=obj.getObjectByName("wake-buoy-lens") as Mesh;
    const lamp=(lens.material as MeshStandardMaterial).clone();
    lens.material=lamp;
    lens.layers.set(DRY_LAYER);
    obj.getObjectByName("wake-buoy-topmark")!.layers.set(DRY_LAYER);
    lamp.emissive.set("#ffc46b");
    return {obj,lamp,span,marker:routeFrame(span.s0)};
  }),[session,world]);
  useEffect(()=>()=>buoys.forEach(buoy=>buoy.lamp.dispose()),[buoys]);
  const ocean=useOcean();
  const wildlife=useMemo(()=>wildlifeRig(life!.scene,ocean.waterPass,session,land),[life,ocean,session,land]);
  useEffect(()=>()=>wildlife.dispose(),[wildlife]);
  useFrame(()=>{
    const seconds=replay.read().seconds,t=seconds+offset,a=ambientTime(seconds);
    for(const {obj,lamp,span,marker} of buoys){
      const phase=a+marker.x*.31;
      obj.visible=t>=span.start;
      obj.position.set(marker.x+marker.nx*6,.06*Math.sin(phase*2.2),marker.z+marker.nz*6);
      obj.rotation.set(.045*Math.cos(phase),marker.yaw,.068*Math.sin(phase*.92));
      lamp.emissiveIntensity=!night?.3:a%4<.6?1.8:.08;
    }
    wildlife.update(t,ocean.uniforms.nightAmount.value);
  });
  return <>{buoys.map(({obj,span})=><primitive key={span.index} object={obj} onClick={(e:import("@react-three/fiber").ThreeEvent<MouseEvent>)=>{
    if(obj.visible&&e.delta<5){e.stopPropagation();onWake(span);}
  }}/>)}
    <primitive object={wildlife.root} dispose={null}/></>;
}
