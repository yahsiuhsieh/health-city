import { useEffect,useMemo } from "react";
import { useFrame,useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Mesh,MeshStandardMaterial } from "three";
import type { Replay } from "../../core/replay.ts";
import { DRY_LAYER } from "../ocean/layers.ts";
import { ambientTime } from "../ocean/ambient-time.ts";
import { routeFrame } from "./route.ts";
import { SYNTHETIC_SESSION as session } from "./session.ts";
import { routeSpans } from "./timeline.ts";
import { wildlifeRig } from "./wildlife-render.ts";
import { useOcean } from "../ocean/OceanEnvironment.tsx";

export function VoyageLife({offset,replay,night,onWake}:{offset:number;replay:Replay;night:boolean;onWake:()=>void}){
  const [world,life]=useLoader(GLTFLoader,["/models/sleep-world.glb","/models/sea-life.glb"]);
  const buoy=useMemo(()=>{const obj=world!.scene.getObjectByName("wake-buoy")!.clone(true);
    obj.scale.y=1.35;
    const lens=obj.getObjectByName("wake-buoy-lens") as Mesh;lens.material=(lens.material as MeshStandardMaterial).clone();
    lens.layers.set(DRY_LAYER);obj.getObjectByName("wake-buoy-topmark")!.layers.set(DRY_LAYER);
    const lamp=lens.material as MeshStandardMaterial;lamp.emissive.set("#ffc46b");return {obj,lamp};},[world]);
  useEffect(()=>()=>buoy.lamp.dispose(),[buoy]);
  const ocean=useOcean();
  const wildlife=useMemo(()=>wildlifeRig(life!.scene,ocean.waterPass),[life,ocean]);
  useEffect(()=>()=>wildlife.dispose(),[wildlife]);
  const wake=routeSpans(session).find(s=>s.stage==="AWAKE")!,marker=routeFrame(wake.s0);
  useFrame(()=>{
    const seconds=replay.read().seconds,t=seconds+offset,a=ambientTime(seconds),phase=a+marker.x*.31;
    buoy.obj.visible=t>=wake.start;
    buoy.obj.position.set(marker.x+marker.nx*6,.06*Math.sin(phase*2.2),marker.z+marker.nz*6);
    buoy.obj.rotation.set(.045*Math.cos(phase),marker.yaw,.068*Math.sin(phase*.92));
    buoy.lamp.emissiveIntensity=!night?.3:a%4<.6?1.8:.08;
    wildlife.update(t,ocean.uniforms.nightAmount.value);
  });
  return <><primitive object={buoy.obj} onClick={(e:import("@react-three/fiber").ThreeEvent<MouseEvent>)=>{if(buoy.obj.visible&&e.delta<5){e.stopPropagation();onWake();}}}/>
    <primitive object={wildlife.root} dispose={null}/></>;
}
