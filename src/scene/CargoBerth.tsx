import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Mesh, MeshStandardMaterial, Object3D, Vector3 } from "three";
import type { InstancedMesh } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { boatPose } from "../core/representative-day.ts";
import type { Replay } from "../core/replay.ts";
import { voyage } from "./sleep-voyage.ts";
import { port } from "./port-layout.ts";
import { DOCK } from "./harbor-layout.ts";
import { cargoPose } from "./port-motion.ts";

const up = new Vector3(0, 1, 0);
const ropeSegments = 6;
const fastenings = [
  { onBoat: [-3.46, 1.20, .94] as const, bollardZ: -4.7 },
  { onBoat: [3.70, 1.26, .79] as const, bollardZ: 4.7 },
];

export function MooringLines({ replay,offset }: { replay: Replay;offset:number|null }) {
  const gangway = useRef<Mesh>(null);
  const ropes = useRef<InstancedMesh>(null);
  const rig = useMemo(() => ({
    ship: new Object3D(), segment: new Object3D(), from: new Vector3(), to: new Vector3(),
    start: new Vector3(), end: new Vector3(), direction: new Vector3(),
  }), []);
  useFrame(() => {
    if (!ropes.current) return;
    ropes.current.visible=voyage(offset,replay.read().seconds).moored;
    if(gangway.current)gangway.current.visible=ropes.current.visible;
    if(!ropes.current.visible)return;
    const pose = boatPose(replay.read().seconds);
    const { ship, segment, from, to, start, end, direction } = rig;
    ship.position.set(port.boatX, pose.y + port.boatTrim, port.boatZ);
    ship.rotation.set(pose.pitch, -Math.PI / 2, pose.roll);
    ship.updateMatrix();
    for (const [i, fastening] of fastenings.entries()) {
      from.fromArray(fastening.onBoat).applyMatrix4(ship.matrix);
      to.set(DOCK.x+.73, DOCK.deck+.24, DOCK.z+fastening.bollardZ);
      start.copy(from);
      for (let k = 1; k <= ropeSegments; k++) {
        const t = k / ropeSegments;
        end.lerpVectors(from, to, t);
        end.y -= .48 * t * (1 - t);
        direction.subVectors(end, start);
        segment.scale.set(1, direction.length(), 1);
        segment.quaternion.setFromUnitVectors(up, direction.normalize());
        segment.position.lerpVectors(start, end, .5);
        segment.updateMatrix();
        ropes.current.setMatrixAt(i * ropeSegments + k - 1, segment.matrix);
        start.copy(end);
      }
    }
    if (gangway.current) {
      from.set(DOCK.x-.48,DOCK.deck+.055,port.boatZ+.6);
      to.set(.6,1.13,1.32).applyMatrix4(ship.matrix);
      direction.subVectors(to,from);
      gangway.current.position.lerpVectors(from,to,.5);
      gangway.current.rotation.z = Math.atan2(direction.y,direction.x);
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
    <primitive object={rig.scene} dispose={null}/>

    {night && <>
      <primitive object={rig.target}/>
      <spotLight position={[-6.62,5.24,-1.5]} target={rig.target} color="#ffdcab"
        intensity={162} angle={.80} penumbra={.68} distance={16}/>
    </>}
  </group>;
}
