import { Captain, HarborFleet } from "./HarborFleet.tsx";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Replay } from "../core/replay.ts";
import { boatPose } from "../core/representative-day.ts";
import type { ReplayDay } from "../core/representative-day.ts";
import { WaterSurface } from "./WaterSurface.tsx";
import { CargoBerth, MooringLines } from "./CargoBerth.tsx";
import { port } from "./port-layout.ts";
import { HarborWalk } from "./HarborWalk.tsx";
import { cameraSpots, DOCK, PAVING_Y } from "./harbor-layout.ts";
import { HarborBlock } from "./HarborBlock.tsx";
import { districtMotion } from "./district-motion.ts";
import { HarborRoad } from "./HarborRoad.tsx";
import { StreetLamp } from "./StreetLamp.tsx";
import { SkylineDistrict } from "./SkylineDistrict.tsx";
import { isTowerView, SKYLINE_PLOTS, TOWER_SCALE } from "./skyline-layout.ts";
import type { CameraCommand, TowerDesignId } from "./skyline-layout.ts";
import type { HrvSkyline } from "../core/skyline.ts";
import { addCameraClearance, CAMERA_DEPTH_OFFSET, CAMERA_FAR, CAMERA_NEAR } from "./camera-depth.ts";

import { SleepIsland } from "./SleepIsland.tsx";
import { voyage } from "./sleep-voyage.ts";
import { HeartRidge } from "./HeartRidge.tsx";
const upAxis=new Vector3(0,1,0);
interface SceneProps {
  offset:number|null;onWake:()=>void;
  heartReady:boolean; onHeart:(start:number,end:number)=>void;
  replay: Replay;
  day: ReplayDay;
  night: boolean;
  cameraCommand: CameraCommand;
  hrv: HrvSkyline;
  onSelect: () => void;
  onSelectBerth: () => void;
  onGraphicsLost: () => void;
  onBoatReady: () => void;
  onBerthReady: () => void;
  onSkylineReady: () => void;
  onWalkReady: () => void;
  onRoadReady: () => void;
  onSelectTower: (design: TowerDesignId) => void;
}

function ReplayDriver({ replay }: { replay: Replay }) {
  useFrame(() => replay.frame(performance.now() / 1000), -2);
  return null;
}

function CameraRig({ cameraCommand,offset,replay }: Pick<SceneProps, "cameraCommand"|"offset"|"replay">) {
  const { camera, gl, size } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const lastShip=useRef(new Vector3());
  const lastYaw=useRef(0);
  const bounded = useMemo(() => new Vector3(), []);
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controlsRef.current = controls;
    controls.minPolarAngle = Math.PI * .12;
    controls.maxPolarAngle = Math.PI * .47;
    controls.minZoom = 2;
    controls.maxZoom = 180;
    controls.enableDamping = false;
    controls.zoomSpeed = .7;
    controls.panSpeed = .65;
    return () => { controls.dispose(); controlsRef.current = null; };
  }, [camera, gl]);
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.minZoom = Math.min(2, size.width / 264, size.height / 204);
    const plot = SKYLINE_PLOTS.find(({ design }) => design.id === cameraCommand.view);

    if (plot) {
      const { x,z } = plot;
      const height = plot.design.height*TOWER_SCALE;
      controls.target.set(x, height * .46, z);
      camera.position.set(x + height * .96, height * .84, z + height * .6);
      camera.zoom = Math.min(size.width / (height + 5), size.height / (height + 16));
    } else if (cameraCommand.view === "skyline") {
      controls.target.set(-123, 23, 0);
      camera.position.copy(controls.target).add(new Vector3(110,90,45));
      camera.zoom = Math.min(size.width / 178, size.height / 148);
    } else if (cameraCommand.view === "ridge") {
      controls.target.set(-225,15,0);
      camera.position.copy(controls.target).add(new Vector3(92,42,0));
      camera.zoom=Math.min(size.width/164,size.height/58);
    } else if (cameraCommand.view === "berth") {
      controls.target.set(port.craneX, port.quayY + 1.75, port.craneZ);
      camera.position.copy(controls.target).add(new Vector3(17, 11, 10));
      camera.zoom = Math.min(size.width / 29, size.height / 19);
    } else if (cameraCommand.view === "walk" || cameraCommand.view === "road" || cameraCommand.view === "square" || cameraCommand.view === "side") {
      const view = cameraCommand.view;
      controls.target.fromArray(cameraSpots[view]);
      const offset = view === "side" ? [-6,13,-22] : view === "square" ? [12,12,8] : [12,15,-11];
      camera.position.copy(controls.target).add(new Vector3(...offset));
      const span = view === "road" || view === "side" ? 34 : 21;
      camera.zoom = Math.min(size.width / span, size.height / (span*.74));
    } else if (cameraCommand.view === "detail" || cameraCommand.view === "sleep") {
      const ship=voyage(offset,replay.read().seconds);
      controls.target.set(ship.x, 1.6, ship.z);lastShip.current.set(ship.x,0,ship.z);
      lastYaw.current=ship.yaw;
      const offsetView=cameraCommand.view==="sleep"?new Vector3(5,13,15).applyAxisAngle(upAxis,ship.yaw):new Vector3(12,5.3,7);
      camera.position.copy(controls.target).add(offsetView);
      camera.zoom = cameraCommand.view==="sleep"?Math.min(size.width/24,size.height/16):Math.min(size.width / 12.8, size.height / 9.4);
    } else if (cameraCommand.view === "harbor") {
      controls.target.set(-4, 2, -2);
      camera.position.copy(controls.target).add(new Vector3(24, 21, 15));
      camera.zoom = Math.min(size.width / 115, size.height / 69);
    } else {
      controls.target.set(-120, 15, 1);
      camera.position.copy(controls.target).add(new Vector3(94, 115, 112));
      camera.zoom = Math.min(size.width / 264, size.height / 204);
    }
    addCameraClearance(camera.position, controls.target);
    camera.updateProjectionMatrix();
    controls.update();
  }, [camera, gl, cameraCommand, offset,replay,size.width, size.height]);
  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    // Keep pan within this representative scene without coupling it to replay.
    const target = controls.target;
    if(cameraCommand.view==="sleep"||cameraCommand.view==="detail"){
      const ship=voyage(offset,replay.read().seconds);
      if(cameraCommand.view==="sleep")camera.position.sub(target).applyAxisAngle(upAxis,ship.yaw-lastYaw.current).add(target);
      lastYaw.current=ship.yaw;
      bounded.set(ship.x,0,ship.z).sub(lastShip.current);
      camera.position.add(bounded);target.add(bounded);lastShip.current.set(ship.x,0,ship.z);
    }
    bounded.set(Math.max(-258, Math.min(96, target.x)), Math.max(0, Math.min(65, target.y)), Math.max(-58, Math.min(56, target.z)));
    camera.position.add(bounded.sub(target));
    target.add(bounded);
    controls.update();
  });
  return null;
}

function Boat({ replay, night, onSelect, onReady,offset }: Pick<SceneProps, "offset"|"replay" | "night" | "onSelect"> & { onReady: () => void }) {
  const gltf = useLoader(GLTFLoader, "/models/working-boat.glb");
  const group = useRef<Group>(null);
  const boat = useMemo(() => {
    const object = gltf.scene.clone(true);
    const copies = new Map<string, MeshStandardMaterial>();
    object.traverse(child => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const copy = (material: MeshStandardMaterial) => {
        const key = material.uuid + (child.name.startsWith("mast-lamp") ? ":lamp" : child.name.startsWith("cabin-window")?":window":"");
        if (!copies.has(key)) copies.set(key, material.clone());
        return copies.get(key)!;
      };
      child.material = Array.isArray(child.material) ? child.material.map(copy) : copy(child.material);
    });
    return object;
  }, [gltf]);
  const cabin=useMemo(()=>{
    const materials=new Set<MeshStandardMaterial>();
    boat.traverse(o=>{if(o instanceof Mesh && o.name.startsWith("cabin-window"))materials.add(o.material)});
    return [...materials];
  },[boat]);
  useEffect(() => onReady(), [onReady]);
  useEffect(() => () => {
    const disposed = new Set<MeshStandardMaterial>();
    boat.traverse(child => {
      if (!(child instanceof Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!disposed.has(material)) { material.dispose(); disposed.add(material); }
      }
    });
  }, [boat]);
  useEffect(() => {
    boat.traverse(child => {
      if (!(child instanceof Mesh) || !(child.material instanceof MeshStandardMaterial)) return;
      const material = child.material;
      if (child.name.startsWith("cabin-window")) {
        material.color.set(night ? "#dfb76f" : "#365c62");
        material.emissive.set(night ? "#ffc97a" : "#000000");
        material.emissiveIntensity = night ? .65 : 0;
      }
      if (child.name.startsWith("navigation-lamp")) material.emissiveIntensity = night ? 2 : .1;
      if (child.name.startsWith("mast-lamp")) {
        material.emissive.set("#ffe1aa");
        material.emissiveIntensity = night ? 1.5 : 0;
      }
    });
  }, [boat, night]);
  useFrame(() => {
    if (!group.current) return;
    const seconds=replay.read().seconds;
    const ship=voyage(offset,seconds);
    const pose=boatPose(ship.moored?seconds:ship.t+23*3600);
    for(const window of cabin){
      window.emissive.setHex(ship.stage==="AWAKE"||night?0xffc97a:0);
      window.emissiveIntensity=ship.stage==="AWAKE"?1.4:night?(ship.stage==="DEEP"?.18:.65):0;
    }
    group.current.position.set(ship.x, pose.y + port.boatTrim, ship.z);
    group.current.rotation.set(pose.pitch, ship.yaw, pose.roll);
  });
  const pointerDown = useRef<[number, number] | null>(null);
  const inspect = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const down = pointerDown.current;
    if (down && Math.hypot(event.clientX - down[0], event.clientY - down[1]) < 5) onSelect();
    pointerDown.current = null;
  };
  return <group ref={group} onPointerDown={event => { pointerDown.current = [event.clientX, event.clientY]; }} onClick={inspect}>
    <primitive object={boat} dispose={null} /><Captain/>
    {night && <><pointLight position={[-2.0, 3.2, 0]} color="#ffce86" intensity={8} distance={5} />
      <pointLight position={[-2.3, 1.8, 0]} color="#ffd493" intensity={5} distance={4} /></>}
  </group>;
}

function Mooring() {
  return <group position={[DOCK.x, 0, DOCK.z]} rotation={[0, -Math.PI / 2, 0]}>
    <mesh position={[0, .05, 0]} castShadow receiveShadow><boxGeometry args={[11, .65, 1.65]} /><meshStandardMaterial color="#a6b8ab" roughness={.9} /></mesh>
    {Array.from({ length: 23 }, (_, i) => <mesh key={i} position={[-5.25 + i * .48, .4, 0]} receiveShadow castShadow>
      <boxGeometry args={[.46, .12, 1.75]} /><meshStandardMaterial color={i % 3 ? "#b8a17c" : "#c1ad88"} roughness={.9} />
    </mesh>)}
    {[-4.7, 0, 4.7].map(x => <group key={x} position={[x, .49, -.73]}>
      <mesh castShadow><cylinderGeometry args={[.09, .13, .45, 8]} /><meshStandardMaterial color="#365d53" /></mesh>
      <mesh position={[0, .2, 0]} castShadow><boxGeometry args={[.36, .09, .12]} /><meshStandardMaterial color="#365d53" /></mesh>
    </group>)}
    {[-3.3,2.9].map(x=><mesh key={x} position={[x,.15,-.92]} castShadow>
      <torusGeometry args={[.25,.09,8,14]}/><meshStandardMaterial color="#414749" roughness={.93}/>
    </mesh>)}
  </group>;
}

export default function BoatScene(props: SceneProps) {
  const { night } = props;
  const motion = useMemo(() => districtMotion(props.day), [props.day]);
  const focus = isTowerView(props.cameraCommand.view) ? props.cameraCommand.view : null;
  const harborView = ["harbor", "walk", "detail", "berth"].includes(props.cameraCommand.view);
  return <Canvas orthographic camera={{ position: [68, 64, 18], near: CAMERA_NEAR, far: CAMERA_FAR, zoom: 10 }}
    shadows dpr={[1, 1.75]} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
    fallback={<div className="scene-message">This browser cannot display the 3D scene. Enable graphics acceleration and reload.</div>}
    onCreated={({ gl }) => {
      gl.domElement.setAttribute("aria-label", "Harbor walk, road traffic, and the HRV skyline. Use the view controls to inspect them.");
    }}>
    <color attach="background" args={[night ? "#29454f" : "#b8dad3"]} />
    <fog attach="fog" args={[night ? "#29454f" : "#b8dad3",
      CAMERA_DEPTH_OFFSET + (harborView ? 52 : 195), CAMERA_DEPTH_OFFSET + (harborView ? 135 : 310)]} />
    <hemisphereLight args={[night ? "#bacddd" : "#f7f5df", night ? "#31565a" : "#71958b", night ? 1.1 : 2]} />
    <directionalLight position={harborView ? [8, 13, 7] : [65, 110, 55]} intensity={night ? 1 : 2.7} color={night ? "#b5cfe5" : "#fff0cc"}
      castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={harborView ? -32 : -90} shadow-camera-right={harborView ? 32 : 90}
      shadow-camera-top={harborView ? 32 : 90} shadow-camera-bottom={harborView ? -32 : -90} shadow-normalBias={.035} />
    <ReplayDriver replay={props.replay} />
    <ContextEvents onGraphicsLost={props.onGraphicsLost} />
    <CameraRig replay={props.replay} offset={props.offset} cameraCommand={props.cameraCommand} />
    <WaterSurface replay={props.replay} night={night} wideView={!harborView} cameraDepthOffset={CAMERA_DEPTH_OFFSET} />
    {!focus && <Suspense fallback={null}><HeartRidge day={props.day} replay={props.replay} available={props.heartReady} inspect={props.onHeart}/></Suspense>}
    {!focus && <HarborBlock night={night}/>}
    <group visible={!focus}>

      {props.offset!==null && <SleepIsland replay={props.replay} offset={props.offset} onWake={props.onWake}/>}
      <Mooring /><MooringLines offset={props.offset} replay={props.replay}/>
      <StreetLamp position={[-4.95, DOCK.deck, -6.1]} toward={Math.PI / 2} night={night} scale={.68} />
      <StreetLamp position={[-7.2, PAVING_Y, 3.58]} toward={Math.PI / 2} night={night} scale={.68} />
      <Suspense fallback={null}><Boat offset={props.offset} replay={props.replay} night={night} onSelect={props.onSelect} onReady={props.onBoatReady} /></Suspense>
      <Suspense fallback={null}>
        <HarborFleet replay={props.replay}/><CargoBerth replay={props.replay} night={night} onReady={props.onBerthReady} onSelect={props.onSelectBerth} />
      </Suspense>
      <Suspense fallback={null}>
        <HarborWalk day={props.day} motion={motion} replay={props.replay} onReady={props.onWalkReady} />
      </Suspense>
      <Suspense fallback={null}>
        <HarborRoad day={props.day} motion={motion} replay={props.replay} night={night} onReady={props.onRoadReady} />
      </Suspense>
    </group>
    <Suspense fallback={null}>
      <SkylineDistrict night={night} hrv={props.hrv} focus={focus}
        onReady={props.onSkylineReady} onSelect={props.onSelectTower} />
    </Suspense>
  </Canvas>;
}

function ContextEvents({ onGraphicsLost }: Pick<SceneProps, "onGraphicsLost">) {
  const { gl } = useThree();
  useEffect(() => {
    gl.domElement.addEventListener("webglcontextlost", onGraphicsLost);
    return () => gl.domElement.removeEventListener("webglcontextlost", onGraphicsLost);
  }, [gl, onGraphicsLost]);
  return null;
}
