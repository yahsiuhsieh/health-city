import { useOverview } from "./city/OverviewModel.tsx";
import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {Group,InstancedMesh,Object3D,Vector3} from "three";
import type {Quaternion} from "three";
import type { Replay } from "../core/replay.ts";

import {berths,cargoQuay,swellAmplitude,vesselLengths,vesselBeams} from "./city/harbor-plan.ts";
export {berths};
const up=new Vector3(0,1,0);
function useFleetModel(name: string) {
  const { scene } = useLoader(GLTFLoader,"/models/harbor-fleet.glb");
  return useMemo(() => {
    const model = scene.getObjectByName(name)!.clone();
    model.castShadow = model.receiveShadow = true;
    return model;
  },[scene,name]);
}

export function Captain({position,quaternion}:{position:Vector3;quaternion:Quaternion}) {
  const model = useFleetModel("Captain");
  return <primitive object={model} position={position} quaternion={quaternion} dispose={null}/>;
}

function BerthedShip({ berth, replay }: { berth: typeof berths[number]; replay: Replay }) {
  const model = useFleetModel(berth.name);
  const overview = useOverview();
  const group = useRef<Group>(null);
  const ropes=useRef<InstancedMesh>(null);
  const rig=useMemo(()=>{
    const {name,x,z}=berth,length=vesselLengths[name]!,width=vesselBeams[name]!;
    const cargo=name==="Freighter",marina=z>50;
    const pierZ=marina?60:name==="WaterTaxi"?43.5:name==="Tug"?43.5:z-4.05;
    const deck=cargo?3.55:name==="Tug"?1.98:name==="Trawler"?1.82:1.08;
    const lines=[-1,1].map(sign=>{
      const local=marina?new Vector3(length*.44,deck,sign*width*.30):
        new Vector3(sign*length*.37,deck,cargo?width*.40:Math.sign(pierZ-z)*width*.42);
      const anchor=cargo?new Vector3(cargoQuay.edge-.65,cargoQuay.top+.35,sign<0?-78:-14):
        marina?new Vector3(x+sign*2.2,.68,60+Math.sign(z-60)*.48):
        new Vector3(sign<0?-2.6:7.6,.68,pierZ+Math.sign(z-pierZ)*.5);
      return {local,anchor};
    });
    return {lines,amplitude:swellAmplitude(length),transform:new Object3D(),from:new Vector3(),start:new Vector3(),end:new Vector3(),delta:new Vector3()};
  },[berth]);
  useFrame(() => {
    if (!group.current) return;
    const phase = replay.read().seconds*.002 + berth.z;
    group.current.position.y = rig.amplitude*Math.sin(phase);
    group.current.rotation.z = .006*Math.sin(phase*.83);
    if(!ropes.current)return;
    group.current.updateMatrix();
    const {transform,start,end,from,delta}=rig;
    for(const [i,{local,anchor}] of rig.lines.entries()){
      from.copy(local).applyMatrix4(group.current.matrix);start.copy(from);
      for(let j=1;j<=6;j++){
        const t=j/6;end.lerpVectors(from,anchor,t);end.y-=1.55*t*(1-t);
        delta.subVectors(end,start);transform.scale.set(1,delta.length(),1);
        transform.quaternion.setFromUnitVectors(up,delta.normalize());
        transform.position.lerpVectors(start,end,.5);transform.updateMatrix();
        ropes.current.setMatrixAt(i*6+j-1,transform.matrix);start.copy(end);
      }
    }
    ropes.current.instanceMatrix.needsUpdate=true;
  });
  return <><group ref={group} position={[berth.x,0,berth.z]} rotation-y={berth.yaw}><primitive object={model} dispose={null}/></group>
    {!overview && <instancedMesh ref={ropes} args={[undefined,undefined,12]} frustumCulled={false}>
      <cylinderGeometry args={[.036,.036,1,6]}/><meshStandardMaterial color="#8d7860" roughness={.9}/>
    </instancedMesh>}</>;
}

export function HarborFleet({ replay }: { replay: Replay }) {
  return <group name="Permanent harbor fleet">{berths.map(berth=><BerthedShip key={berth.x+"/"+berth.z} berth={berth} replay={replay}/>)}</group>;
}
