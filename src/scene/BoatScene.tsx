import { OverviewDetail, OverviewModel, useOverview } from "./city/OverviewModel.tsx";
import { CitySun } from "./city/CitySun.tsx";
import { cityLight } from "./city/palette.ts";
import type { RefObject } from "react";
import { Captain, HarborFleet } from "./HarborFleet.tsx";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { ACESFilmicToneMapping, Box3, InstancedMesh, Object3D, PointLight, PCFSoftShadowMap, Group, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Replay } from "../core/replay.ts";
import { boatPose } from "../core/representative-day.ts";
import type { ReplayDay } from "../core/representative-day.ts";
import { OceanProvider } from "./ocean/OceanEnvironment.tsx";
import { DRY_LAYER } from "./ocean/layers.ts";
import { BoatWake } from "./ocean/BoatWake.tsx";
import { SeaSplashes } from "./ocean/SeaSplashes.tsx";
import { wakePreview } from "./ocean/wake-preview.ts";
import { previewPose, previewWake, voyageWake } from "./ocean/wake.ts";
import { Seabed } from "./ocean/Seabed.tsx";
import { WaterSurface } from "./WaterSurface.tsx";
import { CargoBerth, MooringLines } from "./CargoBerth.tsx";
import { port } from "./port-layout.ts";
import { HarborWalk } from "./HarborWalk.tsx";
import { CitySignals } from "./city/CitySignals.tsx";
import { cameraSpots } from "./city/camera-spots.ts";
import { WORK_FLOAT as DOCK, PAVING_Y } from "./harbor-layout.ts";
import { CityGround } from "./city/CityGround.tsx";
import { HarborBlock } from "./HarborBlock.tsx";
import { districtMotion } from "./district-motion.ts";
import { HarborRoad } from "./HarborRoad.tsx";
import { StreetLamp } from "./StreetLamp.tsx";
import { SkylineDistrict } from "./SkylineDistrict.tsx";
import { isTowerView, SKYLINE_PLOTS } from "./skyline-layout.ts";
import type { CameraCommand, TowerDesignId } from "./skyline-layout.ts";
import type { HrvSkyline } from "../core/skyline.ts";
import { addCameraClearance, CAMERA_DEPTH_OFFSET, CAMERA_FAR, CAMERA_NEAR } from "./camera-depth.ts";

import { VoyageLife } from "./sleep/VoyageLife.tsx";
import { islandRevealAt } from "./sleep/timeline.ts";
import { cabinState,companionState } from "./sleep/vessel-state.ts";
import { SYNTHETIC_SESSION } from "./sleep/session.ts";
import { StageInspection } from "./sleep/StageInspection.tsx";
import { destination } from "./sleep/island-preview.ts";
import { DestinationIsland } from "./sleep/DestinationIsland.tsx";
import { SeaMist } from "./sleep/SeaMist.tsx";
import { StageEnvironments } from "./sleep/StageEnvironments.tsx";
import { voyage } from "./sleep-voyage.ts";
import { HeartRidge } from "./HeartRidge.tsx";
import {cityPreview} from "./city/preview.ts";
const CitySlice=import.meta.env.DEV?lazy(()=>import("./city/CitySlice.tsx")):null;
import {blockOffsetX,sliceBerth} from "./city/slice-plan.ts";
const crewOrigin=new Vector3();
const upAxis=new Vector3(0,1,0);
interface SceneProps {
  offset:number|null;onWake:()=>void;onIsland:()=>void;onStage:(index:number)=>void;
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
  onPlot:(id:number)=>void;
  onSelectTower: (design: TowerDesignId) => void;
}

function workingBoat(offset:number|null, seconds:number) {
  const ship=voyage(offset,seconds);
  return wakePreview ? {...ship,...previewPose(seconds)} : ship;
}

function ReplayDriver({ replay }: { replay: Replay }) {
  useFrame(() => replay.frame(performance.now() / 1000), -2);
  return null;
}

function CameraRig({ cameraCommand,offset,replay,focus }: Pick<SceneProps, "cameraCommand"|"offset"|"replay"> & {focus:RefObject<Vector3>}) {
  const { camera, gl, size } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const lastShip=useRef(new Vector3());
  const lastYaw=useRef(0),lastWidth=useRef(1),lastIsland=useRef(0);
  const followedReplay = cameraCommand.view === "sleep" || cameraCommand.view === "detail" ? replay : null;
  const followedOffset = followedReplay ? offset : null;
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
    controls.minZoom = Math.min(2, size.width / 376, size.height / 248);
    const plot = SKYLINE_PLOTS.find(({ design }) => design.id === cameraCommand.view);

    if(cityPreview && cameraCommand.view!=="harbor" && cameraCommand.view!=="berth"){
      const view=cameraCommand.view;
      const framing=view==="walk"||view==="road"?{at:[-31+blockOffsetX,4.1,15],eye:[20,10,34],w:42,h:24}:
        view==="detail"?{at:[sliceBerth.x,2.3,sliceBerth.z],eye:[23,11,17],w:25,h:17}:
        view==="world"?{at:[-119,14,0],eye:[100,120,118],w:286,h:211}:
        {at:[-50+blockOffsetX,18,-9],eye:[62,86,-100],w:137,h:112};
      controls.target.set(framing.at[0]!,framing.at[1]!,framing.at[2]!);
      camera.position.copy(controls.target).add(new Vector3(...framing.eye));
      camera.zoom=Math.min(size.width/framing.w,size.height/framing.h);
    } else if (plot) {
      const { x,z } = plot;
      const height = plot.height;
      controls.target.set(x, height * .46, z);
      camera.position.set(x - height * .96, height * .60, z + height * .35);
      camera.zoom = Math.min(size.width / (height + 5), size.height / (height + 24));
    } else if (cameraCommand.view === "skyline") {
      const id=import.meta.env.DEV ? new URLSearchParams(window.location.search).get("reviewPlot") : null;
      const site=id!==null && /^\d+$/.test(id)?SKYLINE_PLOTS[Number(id)]:undefined;
      const coastView=import.meta.env.DEV?new URLSearchParams(window.location.search).get("reviewCoast"):null;
      if(coastView==="promenade"||coastView==="cove"){
        controls.target.set(...(coastView==="cove"?[-65,1.8,99]:[-8,2,53]) as [number,number,number]);
        camera.position.copy(controls.target).add(new Vector3(22,43,25));
        camera.zoom=Math.min(size.width/70,size.height/51);
      }else if(import.meta.env.DEV && new URLSearchParams(window.location.search).get("reviewStreet")==="market"){
        controls.target.set(-159,12,-8);
        camera.position.copy(controls.target).add(new Vector3(23,65,55));
        camera.zoom=Math.min(size.width/105,size.height/77);
      }else if(site){
        controls.target.set(site.x,site.interimForm==="park"?4:7.2,site.z);
        camera.position.copy(controls.target).add(new Vector3(site.id===5?-8:8,34,25).applyAxisAngle(upAxis,site.yaw));
        camera.zoom=Math.min(size.width/38,size.height/29);
      }else{
        controls.target.set(-123, 23, 0);
        camera.position.copy(controls.target).add(new Vector3(110,90,45));
        camera.zoom = Math.min(size.width / 178, size.height / 148);
      }
    } else if (cameraCommand.view === "sleep-island") {
      lastIsland.current=0;controls.target.set(195,2,0);
      camera.position.copy(controls.target).add(new Vector3(-22,47,39));
      camera.zoom=Math.min(size.width/64,size.height/(64*.78));
    } else if (cameraCommand.view === "sleep-route") {
      controls.target.set(108,0,0);
      camera.position.copy(controls.target).add(new Vector3(9,120,92));
      camera.zoom=Math.min(size.width/245,size.height/104);
    } else if (cameraCommand.view === "ridge") {
      controls.target.set(-225,15,0);
      camera.position.copy(controls.target).add(new Vector3(92,42,0));
      camera.zoom=Math.min(size.width/164,size.height/58);
    } else if (cameraCommand.view === "berth") {
      controls.target.fromArray(cameraSpots.berth);
      camera.position.copy(controls.target).add(new Vector3(17, 11, 10));
      camera.zoom = Math.min(size.width / 53, size.height / 33);
    } else if (cameraCommand.view === "walk" || cameraCommand.view === "road" || cameraCommand.view === "square" || cameraCommand.view === "side") {
      const view = cameraCommand.view;
      controls.target.fromArray(cameraSpots[view]);
      const offset = view === "side" ? [13,21,-22] : view === "square" ? [9,26,18] : [-16,30,18];
      camera.position.copy(controls.target).add(new Vector3(...offset));
      const span = view === "road" ? 77 : view === "side" ? 45 : 36;
      camera.zoom = Math.min(size.width / span, size.height / (span*.74));
    } else if (followedReplay) {
      const ship=workingBoat(followedOffset,followedReplay.read().seconds);
      controls.target.set(ship.x, cameraSpots.detail[1], ship.z);lastShip.current.set(ship.x,0,ship.z);
      lastYaw.current=ship.yaw;lastWidth.current=1;
      const offsetView=cameraCommand.view==="sleep"?(wakePreview?new Vector3(5,13,15):new Vector3(-8,20,19)).applyAxisAngle(upAxis,ship.yaw):new Vector3(12,5.3,7);
      camera.position.copy(controls.target).add(offsetView);
      camera.zoom = cameraCommand.view==="sleep"?(wakePreview?Math.min(size.width/24,size.height/16):Math.min(size.width/43,size.height/29)):Math.min(size.width / 25, size.height / 16);
    } else if (cameraCommand.view === "harbor") {
      controls.target.fromArray(cameraSpots.harbor);
      camera.position.copy(controls.target).add(new Vector3(24, 21, 15));
      camera.zoom = Math.min(size.width / 162, size.height / 108);
    } else {
      controls.target.set(-111, 14, 0);
      camera.position.copy(controls.target).add(new Vector3(94, 115, 112));
      camera.zoom = Math.min(size.width / 376, size.height / 248);
    }
    addCameraClearance(camera.position, controls.target);
    camera.updateProjectionMatrix();
    controls.update();
  }, [camera, gl, cameraCommand, followedOffset, followedReplay, size.width, size.height]);
  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    // Keep pan within this representative scene without coupling it to replay.
    const target = controls.target;
    if(!cityPreview && (cameraCommand.view==="sleep"||cameraCommand.view==="detail")){
      const ship=workingBoat(offset,replay.read().seconds);
      if(cameraCommand.view==="sleep" && ship.yaw!==lastYaw.current){
        camera.position.sub(target).applyAxisAngle(upAxis,ship.yaw-lastYaw.current).add(target);
        camera.lookAt(target);
      }
      lastYaw.current=ship.yaw;
      const animal=cameraCommand.view==="sleep"&&!wakePreview&&ship.stage==="REM"?companionState(SYNTHETIC_SESSION,ship.t,replay.read().seconds):null;
      const spread=animal?.kind==="whale"?animal.fade:0;
      const shift=-12*spread, width=1+.38*spread;
      ship.x+=shift*Math.sin(ship.yaw);ship.z+=shift*Math.cos(ship.yaw);
      if(width!==lastWidth.current){camera.zoom*=lastWidth.current/width;camera.updateProjectionMatrix();lastWidth.current=width;}
      bounded.set(ship.x,0,ship.z).sub(lastShip.current);
      camera.position.add(bounded);target.add(bounded);lastShip.current.set(ship.x,0,ship.z);
    }
    if(cameraCommand.view==="sleep-island" && offset!==null){
      const level=islandRevealAt(SYNTHETIC_SESSION,offset+replay.read().seconds);
      if(level!==lastIsland.current){
        const land=destination(),step=level-lastIsland.current,width=Math.max(12,2.95*land.radius);
        bounded.set((land.center[0]-195)*step,0,land.center[1]*step);target.add(bounded);camera.position.add(bounded);
        camera.zoom*=(64+(width-64)*lastIsland.current)/(64+(width-64)*level);camera.updateProjectionMatrix();
        lastIsland.current=level;
      }
    }
    bounded.set(Math.max(-262, Math.min(cameraCommand.view.startsWith("sleep") || cameraCommand.view === "detail" ? 245 : 96, target.x)), Math.max(0, Math.min(65, target.y)), Math.max(-120, Math.min(118, target.z)));
    camera.position.add(bounded.sub(target));
    target.add(bounded);
    focus.current.copy(target);
  });
  return null;
}

function Boat({ replay, night, onSelect, onReady,offset }: Pick<SceneProps, "offset"|"replay" | "night" | "onSelect"> & { onReady: () => void }) {
  const overview=useOverview();
  const gltf = useLoader(GLTFLoader, "/models/city-working-boat.glb");
  const group = useRef<Group>(null);
  const boat = useMemo(() => {
    const object = gltf.scene.clone(true);
    object.updateMatrixWorld(true);
    const box = new Box3();
    const copies = new Map<string, MeshStandardMaterial>();
    object.traverse(child => {
      if (!(child instanceof Mesh)) return;
      child.geometry.computeBoundingBox();
      if (box.copy(child.geometry.boundingBox!).applyMatrix4(child.matrixWorld).min.y > .55) child.layers.set(DRY_LAYER);
      child.castShadow = true;
      child.receiveShadow = true;
      const copy = (material: MeshStandardMaterial) => {
        const key = material.uuid + (child.name==="anchor-light" ? ":anchor" : child.name.startsWith("mast-lamp") ? ":lamp" : child.name.startsWith("cabin-window")?":window":"");
        if (!copies.has(key)) copies.set(key, material.clone());
        return copies.get(key)!;
      };
      child.material = Array.isArray(child.material) ? child.material.map(copy) : copy(child.material);
    });
    return object;
  }, [gltf]);
  const captain=useMemo(()=>{
    const socket=boat.getObjectByName("captain-socket")!;
    return {position:socket.getWorldPosition(new Vector3()),quaternion:socket.getWorldQuaternion(new Quaternion())};
  },[boat]);
  const rig=useMemo(()=>{
    const windows=new Set<MeshStandardMaterial>(),shutters:Mesh[]=[];
    boat.traverse(o=>{if(o instanceof Mesh){
      if(o.name.startsWith("cabin-window"))windows.add(o.material);
      if(o.name.startsWith("cabin-shutter"))shutters.push(o);
    }});
    return {windows,shutters,anchor:boat.getObjectByName("bow-anchor")!,ball:boat.getObjectByName("anchor-ball")!,
      lamp:boat.getObjectByName("anchor-light") as Mesh,link:new Object3D()};
  },[boat]);
  const crew=useRef<Group>(null),chain=useRef<InstancedMesh>(null),foam=useRef<Group>(null);
  const upper=useRef<PointLight>(null),lower=useRef<PointLight>(null);
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
    const ship=workingBoat(offset,seconds);
    const pose=boatPose(ship.moored?seconds:ship.t+23*3600);
    const state=cabinState(SYNTHETIC_SESSION,ship.t);
    for(const window of rig.windows){
      window.emissive.setHex(state.bright>0?0xffd27f:0xffc97a);
      window.emissiveIntensity=night?state.night:state.day;
    }
    for(const shutter of rig.shutters)shutter.scale.y=.06+.94*state.closed;
    rig.anchor.position.y=.78-state.anchor*1.91;
    const submerged=rig.anchor.position.y*1.42+pose.y+port.boatTrim<0;
    rig.ball.visible=submerged&&!night;rig.lamp.visible=submerged&&night;
    const lampMaterial=rig.lamp.material as MeshStandardMaterial;
    lampMaterial.emissive.setHex(0xfff7e1);lampMaterial.emissiveIntensity=1.5;
    if(upper.current)upper.current.intensity=8*state.lamps;
    if(lower.current)lower.current.intensity=5*state.lamps;
    if(crew.current){
      crew.current.visible=state.captain!=="inside";
      crew.current.position.copy(captain.position);
      if(state.captain==="bow")crew.current.position.set(5.7,1.64,.53);
    }
    if(chain.current){
      const length=Math.min(state.anchor*2.71,1.32+pose.y+port.boatTrim);
      chain.current.count=Math.max(0,Math.min(36,Math.floor(length/.068)));
      for(let i=0;i<chain.current.count;i++){
        rig.link.position.set(7.29,1.32-i*.068,1.7);rig.link.rotation.y=i%2*Math.PI/2;
        rig.link.scale.set(.67,1,1);rig.link.updateMatrix();chain.current.setMatrixAt(i,rig.link.matrix);
      }
      chain.current.instanceMatrix.needsUpdate=true;
    }
    if(foam.current){foam.current.visible=state.entry>.001;foam.current.scale.setScalar(state.entry);}
    const yaw=ship.yaw+state.swing;
    group.current.position.set(ship.x+7.29*(Math.cos(ship.yaw)-Math.cos(yaw)),pose.y+port.boatTrim,
      ship.z+7.29*(Math.sin(yaw)-Math.sin(ship.yaw)));
    group.current.rotation.set(pose.pitch,yaw,pose.roll);
  });
  const pointerDown = useRef<[number, number] | null>(null);
  const inspect = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const down = pointerDown.current;
    if (down && Math.hypot(event.clientX - down[0], event.clientY - down[1]) < 5) onSelect();
    pointerDown.current = null;
  };
  return <group ref={group} onPointerDown={event => { pointerDown.current = [event.clientX, event.clientY]; }} onClick={inspect}>
    <OverviewModel model={boat} omitSmall/><group ref={crew}><Captain position={crewOrigin} quaternion={captain.quaternion}/></group>
    <instancedMesh ref={chain} args={[undefined,undefined,36]} frustumCulled={false}><torusGeometry args={[.041,.009,4,8]}/><meshStandardMaterial color="#485653"/></instancedMesh>
    <group ref={foam} position={[7.29,.018,1.72]}>{[-1,0,1].map(i=><mesh key={i} position={[i*.14,0,i*i*.1]} scale={[.17,.03,.1]}><icosahedronGeometry args={[1,0]}/><meshBasicMaterial color="#ddece2"/></mesh>)}</group>
    {night && !overview && <><pointLight ref={upper} position={[-2.0, 3.2, 0]} color="#ffce86" intensity={8} distance={5} />
      <pointLight ref={lower} position={[-2.3, 1.8, 0]} color="#ffd493" intensity={5} distance={4} /></>}
  </group>;
}

function Mooring() {
  const overview=useOverview();
  return <group position={[DOCK.x, 0, DOCK.z]} >
    <mesh position={[0, .05, 0]} castShadow receiveShadow><boxGeometry args={[17.2, .65, 1.65]} /><meshStandardMaterial color="#a6b8ab" roughness={.9} /></mesh>
    {overview ? <mesh position-y={.4} castShadow receiveShadow><boxGeometry args={[17.26,.12,1.75]}/><meshStandardMaterial color="#bba480" roughness={.9}/></mesh> : Array.from({ length: 36 }, (_, i) => <mesh key={i} position={[-8.4 + i * .48, .4, 0]} receiveShadow castShadow>
      <boxGeometry args={[.46, .12, 1.75]} /><meshStandardMaterial color={i % 3 ? "#b8a17c" : "#c1ad88"} roughness={.9} />
    </mesh>)}
    {!overview && [-7.3, 0, 7.3].map(x => <group key={x} position={[x, .49, -.73]}>
      <mesh castShadow><cylinderGeometry args={[.09, .13, .45, 8]} /><meshStandardMaterial color="#365d53" /></mesh>
      <mesh position={[0, .2, 0]} castShadow><boxGeometry args={[.36, .09, .12]} /><meshStandardMaterial color="#365d53" /></mesh>
    </group>)}
    {!overview && [-3.3,2.9].map(x=><mesh key={x} position={[x,.15,-.92]} castShadow>
      <torusGeometry args={[.25,.09,8,14]}/><meshStandardMaterial color="#414749" roughness={.93}/>
    </mesh>)}
  </group>;
}

export default function BoatScene(props: SceneProps) {
  const { night } = props;
  const cameraFocus=useRef(new Vector3());
  const light=night?cityLight.night:cityLight.day;
  const dryLand=useRef<Group>(null);
  const wakeSource=useMemo(()=>wakePreview?previewWake:voyageWake(props.offset),[props.offset]);
  const motion = useMemo(() => districtMotion(props.day), [props.day]);
  const focus = isTowerView(props.cameraCommand.view) ? props.cameraCommand.view : null;
  const harborView = ["harbor", "walk", "detail", "berth"].includes(props.cameraCommand.view);
  const {onBoatReady,onBerthReady,onSkylineReady,onWalkReady,onRoadReady}=props;
  const sliceReady=useCallback(()=>{
    onBoatReady();onSkylineReady();onWalkReady();onRoadReady();
  },[onBoatReady,onSkylineReady,onWalkReady,onRoadReady]);
  return <Canvas orthographic camera={{ position: [68, 64, 18], near: CAMERA_NEAR, far: CAMERA_FAR, zoom: 10 }}
    shadows="soft" dpr={[1, 1.75]} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
    fallback={<div className="scene-message">This browser cannot display the 3D scene. Enable graphics acceleration and reload.</div>}
    onCreated={({ gl, raycaster }) => {
      gl.localClippingEnabled=cityPreview;
      gl.toneMapping=ACESFilmicToneMapping;
      gl.toneMappingExposure=1;
      gl.shadowMap.type=PCFSoftShadowMap;
      raycaster.layers.enable(DRY_LAYER);
      gl.domElement.setAttribute("aria-label", "Harbor walk, road traffic, and the HRV skyline. Use the view controls to inspect them.");
    }}>
    <color attach="background" args={[light.air]} />
    <fog attach="fog" args={[light.air,
      CAMERA_DEPTH_OFFSET + (harborView ? 52 : 195), CAMERA_DEPTH_OFFSET + (harborView ? 135 : 310)]} />
    <hemisphereLight args={[light.sky,light.ground,light.fill]} />

    <ReplayDriver replay={props.replay} />
    <ContextEvents onGraphicsLost={props.onGraphicsLost} />
    <CameraRig focus={cameraFocus} replay={props.replay} offset={props.offset} cameraCommand={props.cameraCommand} />
    <CitySun night={night} focus={cameraFocus} wide={["world","skyline","sleep-route"].includes(props.cameraCommand.view)}/>
    <OverviewDetail world={props.cameraCommand.view==="world"}>
    <OceanProvider replay={props.replay} night={night} offset={cityPreview?null:props.offset}>
    <WaterSurface night={night} dryLand={dryLand} />
    {!focus && <Seabed />}
    {!focus && <SeaSplashes hasVoyage={!cityPreview && props.offset!==null} preview={!cityPreview && wakePreview} night={night}/>}
    <group visible={!focus}>
      <Mooring/>
      <Suspense fallback={null}>
        <HarborFleet replay={props.replay}/>
        <CargoBerth replay={props.replay} night={night} onReady={onBerthReady} onSelect={props.onSelectBerth}/>
      </Suspense>
    </group>
    {cityPreview&&CitySlice?<Suspense fallback={null}><CitySlice onPlot={props.onPlot} heartReady={props.heartReady} inspect={props.onHeart} night={night} day={props.day} replay={props.replay} hrv={props.hrv} onReady={sliceReady}/></Suspense>:<>
    {!focus && <BoatWake source={wakeSource} replay={props.replay} night={night}/>}

    <CityGround cameraFocus={cameraFocus} onPlot={props.onPlot} occupiedCount={props.hrv.status==="available"?props.hrv.buildingCount:null} night={night}/>{!focus && <><HarborBlock night={night}/><CitySignals replay={props.replay}/></>}
    <group visible={!focus}>

      {props.offset!==null && !focus && <Suspense fallback={null}><StageEnvironments replay={props.replay} offset={props.offset} follow={props.cameraCommand.view==="sleep"}/></Suspense>}
      {props.offset!==null && <Suspense fallback={null}><VoyageLife offset={props.offset} replay={props.replay} night={night} overview={props.cameraCommand.view==="sleep-route"} onWake={props.onWake}/></Suspense>}
      {props.offset!==null && <><SeaMist/><StageInspection inspect={props.onStage}/><Suspense fallback={null}><DestinationIsland onIsland={props.onIsland}/></Suspense></>}
      {!wakePreview && <MooringLines offset={props.offset} replay={props.replay}/>}
      <StreetLamp position={[DOCK.x-7.8, DOCK.deck, DOCK.z+.58]} toward={Math.PI / 2} night={night} scale={.68} />
      <StreetLamp position={[-7.2, PAVING_Y, 3.58]} toward={Math.PI / 2} night={night} scale={.68} />
      <Suspense fallback={null}><Boat offset={props.offset} replay={props.replay} night={night} onSelect={props.onSelect} onReady={props.onBoatReady} /></Suspense>
    </group>
    <group ref={dryLand} name="Inland details">
    {!focus && <Suspense fallback={null}><HeartRidge day={props.day} replay={props.replay} available={props.heartReady} inspect={props.onHeart}/></Suspense>}
    <group visible={!focus}>
      <Suspense fallback={null}>
        <HarborWalk day={props.day} motion={motion} replay={props.replay} onReady={props.onWalkReady} />
      </Suspense>
      <Suspense fallback={null}>
        <HarborRoad day={props.day} motion={motion} replay={props.replay} night={night} onReady={props.onRoadReady} />
      </Suspense>

    </group>
    <Suspense fallback={null}>
      <SkylineDistrict night={night} hrv={props.hrv} focus={focus}
        onReady={props.onSkylineReady} onSelect={props.onSelectTower} onPlot={props.onPlot} />
    </Suspense>
    </group>
    </>}
    </OceanProvider>
    </OverviewDetail>
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
