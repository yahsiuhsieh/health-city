import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Group } from "three";
import type { Replay } from "../core/replay.ts";

import { freighter } from "./port-layout.ts";

const berths = [
  { name:"Schooner", x:3.1,z:16.1,yaw:0 },
  { name:"Trawler", x:2.7,z:26.4,yaw:0 },
  { name:"Tug", x:1.7,z:36.6,yaw:0 },
  { name:"Freighter", x:freighter.x,z:freighter.z,yaw:-Math.PI/2 },
] as const;

function useFleetModel(name: string) {
  const { scene } = useLoader(GLTFLoader,"/models/harbor-fleet.glb");
  return useMemo(() => {
    const model = scene.getObjectByName(name)!.clone();
    model.castShadow = model.receiveShadow = true;
    return model;
  },[scene,name]);
}

export function Captain() {
  const model = useFleetModel("Captain");
  return <primitive object={model} position={[1.68,1.127,1.18]} dispose={null}/>;
}

function BerthedShip({ berth, replay }: { berth: typeof berths[number]; replay: Replay }) {
  const model = useFleetModel(berth.name);
  const group = useRef<Group>(null);
  useFrame(() => {
    if (!group.current) return;
    const phase = replay.read().seconds*.002 + berth.z;
    group.current.position.y = .055*Math.sin(phase);
    group.current.rotation.z = .006*Math.sin(phase*.83);
  });
  return <group ref={group} position={[berth.x,0,berth.z]} rotation-y={berth.yaw}><primitive object={model} dispose={null}/></group>;
}

export function HarborFleet({ replay }: { replay: Replay }) {
  return <group name="Permanent harbor fleet">{berths.map(berth=><BerthedShip key={berth.name} berth={berth} replay={replay}/>)}</group>;
}
