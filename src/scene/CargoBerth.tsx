import { OverviewModel } from "./city/OverviewModel.tsx";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Mesh, MeshStandardMaterial, Object3D, Vector3 } from "three";
import type { InstancedMesh } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { boatPose } from "../core/representative-day.ts";
import type { Replay } from "../core/replay.ts";
import { destination } from "./sleep/island-preview.ts";
import { captainTrack } from "./sleep/captain.ts";
import { SYNTHETIC_SESSION,elapsedSeconds } from "./sleep/session.ts";
import { voyage } from "./sleep-voyage.ts";
import { workingQuay } from "./city/harbor-plan.ts";
import { port } from "./port-layout.ts";
import { workingLines as fastenings } from "./harbor-layout.ts";
import { cargoPose } from "./port-motion.ts";

const departures=captainTrack(SYNTHETIC_SESSION).filter(l=>l.action==="line"&&l.start<0);
const arrivedAt=elapsedSeconds(SYNTHETIC_SESSION);
const horizontal=new Vector3(1,0,0);
const up = new Vector3(0, 1, 0);
const ropeSegments = 6;
export function MooringLines({ replay,offset }: { replay: Replay;offset:number|null }) {
  const gangway = useRef<Mesh>(null);
  const ropes = useRef<InstancedMesh>(null);
  const rig = useMemo(() => ({
    ship: new Object3D(), segment: new Object3D(), from: new Vector3(), to: new Vector3(),
    start: new Vector3(), end: new Vector3(), direction: new Vector3(),
  }), []);
  useFrame(() => {
    if (!ropes.current) return;
    const vessel=voyage(offset,replay.read().seconds);
    const pier=vessel.stage==="At island"?destination().pier:null;
    ropes.current.visible=vessel.moored || !!pier;
    if(gangway.current)gangway.current.visible=ropes.current.visible;
    if(!ropes.current.visible)return;
    const pose = boatPose(vessel.moored?replay.read().seconds:vessel.t+SYNTHETIC_SESSION.startSecondOfDay,true);
    const { ship, segment, from, to, start, end, direction } = rig;
    ship.position.set(vessel.x, pose.y + port.boatTrim, vessel.z);
    ship.rotation.set(pose.pitch, vessel.yaw, pose.roll);
    ship.updateMatrix();
    for (const [i, fastening] of fastenings.entries()) {
      from.fromArray(fastening.fairlead);
      if(pier)from.z=-from.z;
      from.applyMatrix4(ship.matrix);
      if(pier)to.set(pier[0]+(fastening.fairlead[0]>0?-6.2:6.2),1.75,pier[1]+.94);
      else to.set(fastening.bollardX, workingQuay.top+.34, workingQuay.edge-.6);
      const fast=offset===null || (pier ? vessel.t>=arrivedAt+(i===0?64:28) : vessel.t>=0 || vessel.t<departures[i]!.end);
      start.copy(from);
      for (let k = 1; k <= ropeSegments; k++) {
        const t = k / ropeSegments;
        end.lerpVectors(from, to, t);
        end.y -= .48 * t * (1 - t);
        direction.subVectors(end, start);
        if(fast)segment.scale.set(1,direction.length(),1);else segment.scale.setScalar(0);
        segment.quaternion.setFromUnitVectors(up, direction.normalize());
        segment.position.lerpVectors(start, end, .5);
        segment.updateMatrix();
        ropes.current.setMatrixAt(i * ropeSegments + k - 1, segment.matrix);
        start.copy(end);
      }
    }
    if (gangway.current) {
      if(pier)from.set(pier[0]-.54,1.43,pier[1]+1.35);
      else from.set(port.boatX+.54,workingQuay.top+.055,workingQuay.edge-.26);
      to.set(.54,1.34,pier?2.53:-2.53).applyMatrix4(ship.matrix);
      direction.subVectors(to,from);
      gangway.current.position.lerpVectors(from,to,.5);
      gangway.current.quaternion.setFromUnitVectors(horizontal,direction.clone().normalize());
      gangway.current.scale.x = direction.length();
    }
    ropes.current.instanceMatrix.needsUpdate = true;
  });
  return <><mesh ref={gangway} castShadow receiveShadow><boxGeometry args={[1,.09,.86]}/><meshStandardMaterial color="#cdb88e"/></mesh>
    <instancedMesh ref={ropes} args={[undefined, undefined, ropeSegments * fastenings.length]} frustumCulled={false}>
    <cylinderGeometry args={[.028, .028, 1, 7]}/><meshStandardMaterial color="#937854" roughness={.96}/>
  </instancedMesh></>;
}

export function CargoBerth({ replay, night, onReady, onSelect }: {
  replay: Replay; night: boolean; onReady: () => void; onSelect: () => void;
}) {
  const gltf = useLoader(GLTFLoader, "/models/cargo-berth.glb");
  const rig = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const lamps = new MeshStandardMaterial({ vertexColors: true, roughness: .42 });
    scene.traverse(child => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material.name === "work-lamps") child.material = lamps;
    });
    const target = new Object3D();
    target.position.set(-1.8, 0, -4.4);
    return { scene, lamps, target, turntable: scene.getObjectByName("CraneTurntable")!,
      lines: scene.getObjectByName("HoistLines")!, load: scene.getObjectByName("SlungPallet")! };
  }, [gltf]);
  useEffect(() => onReady(), [onReady]);
  useEffect(() => {
    rig.lamps.emissive.set(night ? "#ffdb99" : "#000000");
    rig.lamps.emissiveIntensity = night ? 1.35 : 0;
  }, [rig, night]);
  useEffect(() => () => rig.lamps.dispose(), [rig]);
  useFrame(() => {
    const { yaw, height } = cargoPose(replay.read().seconds);
    rig.turntable.rotation.y = yaw;
    rig.lines.scale.y = port.sheaveHeight - height - port.slingHeight;
    rig.load.position.y = height;
  });
  const down = useRef<[number, number] | null>(null);
  function inspect(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    if (down.current && Math.hypot(event.clientX - down.current[0], event.clientY - down.current[1]) < 5) onSelect();
    down.current = null;
  }
  return <group name="General cargo berth" position={[port.craneX, port.quayY, port.craneZ]}
    onPointerDown={event => { down.current = [event.clientX, event.clientY]; }} onClick={inspect}>
    <OverviewModel model={rig.scene} animated/>

    {night && <>
      <primitive object={rig.target}/>
      <spotLight position={[-6.62,5.24,-1.5]} target={rig.target} color="#ffdcab"
        intensity={162} angle={.80} penumbra={.68} distance={16}/>
    </>}
  </group>;
}
