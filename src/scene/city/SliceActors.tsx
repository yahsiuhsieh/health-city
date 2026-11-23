import {useEffect,useLayoutEffect,useMemo,useRef} from "react";
import {useFrame,useLoader} from "@react-three/fiber";
import {Box3,CanvasTexture,Group,InstancedMesh,Mesh,MeshBasicMaterial,MeshStandardMaterial,Object3D,PlaneGeometry,Vector3} from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import type {Replay} from "../../core/replay.ts";
import {boatPose,stepsAt,trafficAt} from "../../core/representative-day.ts";
import type {ReplayDay} from "../../core/representative-day.ts";
import {createVehicleRig} from "../vehicle-rig.ts";
import {groundHeight} from "./terrain.ts";
import {blockOffsetX,marketRightLane,sliceBerth,southboundRightLane} from "./slice-plan.ts";
import {TRANSPARENT_MASK} from "../ocean/layers.ts";

const signalCycle=80;
export function crossingPhase(seconds:number){return (seconds/5)%signalCycle;}
export function Signals({replay}:{replay:Replay}){
  const lenses=useRef<(MeshStandardMaterial|null)[]>([]);
  const colors=["#ea5634","#efa72c","#73ce96"];
  useFrame(()=>{
    const t=crossingPhase(replay.read().seconds);
    lenses.current.forEach((m,i)=>{
      if(!m)return;const horizontal=i<3;
      const active=horizontal?(t<27?2:t<31?1:0):(t>=34&&t<56?2:t>=56&&t<60?1:0);
      m.emissiveIntensity=active===i%3?1.5:.015;
      m.color.set(active===i%3?colors[i%3]!:"#312e28");
    });
  });
  return <>{[[-29,9,0],[-11,27,Math.PI/2]].map(([x,z,rotation],i)=><group key={i} position={[x!,groundHeight(x!,z!),z!]} rotation-y={rotation}>
    <mesh position-y={3.2} castShadow><cylinderGeometry args={[.09,.15,6.4,10]}/><meshStandardMaterial color="#626a61"/></mesh>
    <mesh position={[2.3,6.2,0]}><boxGeometry args={[4.7,.14,.14]}/><meshStandardMaterial color="#626a61"/></mesh>
    <mesh position={[4.35,5.65,0]} castShadow><boxGeometry args={[.6,1.55,.42]}/><meshStandardMaterial color="#3b4541"/></mesh>
    {colors.map((color,j)=><mesh key={color} position={[4.35,6.12-j*.47,.23]} rotation-x={Math.PI/2}>
      <cylinderGeometry args={[.19,.19,.12,14]}/><meshStandardMaterial ref={m=>{lenses.current[3*i+j]=m;}} color={color} emissive={color}/>
    </mesh>)}
  </group>)}</>;
}
export type ShadowSpot=[x:number,y:number,z:number,w:number,d:number,opacity:number];
export function Contacts({spots}:{spots:ShadowSpot[]}){
  const ref=useRef<InstancedMesh>(null);
  const {geo,mat,map}=useMemo(()=>{
    const c=document.createElement("canvas");c.width=c.height=64;const ctx=c.getContext("2d")!;
    const fade=ctx.createRadialGradient(32,32,4,32,32,32);fade.addColorStop(0,"white");fade.addColorStop(.55,"#d0d0d0");fade.addColorStop(1,"black");
    ctx.fillStyle=fade;ctx.fillRect(0,0,64,64);
    const map=new CanvasTexture(c),geo=new PlaneGeometry(),mat=new MeshBasicMaterial({alphaMap:map,transparent:true,depthWrite:false,color:"#342e27",opacity:spots[0]?.[5]??.35,polygonOffset:true,polygonOffsetFactor:-1});
    return {geo,mat,map};
  },[spots]);
  useEffect(()=>()=>{geo.dispose();mat.dispose();map.dispose();},[geo,mat,map]);
  useLayoutEffect(()=>{
    const o=new Object3D();o.rotation.x=-Math.PI/2;
    spots.forEach(([x,y,z,w,d],i)=>{o.position.set(x,y,z);o.scale.set(w,d,1);o.updateMatrix();ref.current!.setMatrixAt(i,o.matrix);});
    ref.current!.instanceMatrix.needsUpdate=true;ref.current!.computeBoundingSphere();
  },[spots]);
  return <instancedMesh ref={ref} args={[geo,mat,spots.length]} layers-mask={TRANSPARENT_MASK} renderOrder={2}/>;
}

export function SliceActors({day,replay,night}:{day:ReplayDay;replay:Replay;night:boolean}){
  const [car,personA,personB,ship]=useLoader(GLTFLoader,["vehicle-saloon","pedestrian-commuter","pedestrian-shopper","city-working-boat"].map(s=>"/models/"+s+".glb"));
  const rig=useMemo(()=>createVehicleRig(car!.scene),[car]);
  const people=useMemo(()=>[personA!,personB!].map(source=>{
    const person=source.scene.clone(true),height=new Box3().setFromObject(person).getSize(new Vector3()).y;
    person.scale.multiplyScalar(1.75/height);
    person.traverse(n=>{if(n instanceof Mesh)n.castShadow=true;});return person;
  }),[personA,personB]);
  const shipModel=useMemo(()=>{
    const root=ship!.scene.clone(true);
    const cabin=new MeshStandardMaterial({color:"#465b60",roughness:.35});
    root.traverse(n=>{if(n instanceof Mesh){n.castShadow=n.receiveShadow=true;if(n.name.startsWith("cabin-window")){n.material=cabin;}}});
    return {root,cabin};
  },[ship]);
  useEffect(()=>()=>shipModel.cabin.dispose(),[shipModel]);
  useEffect(()=>{shipModel.cabin.emissive.set(night?"#ffd9a0":"#000000");shipModel.cabin.emissiveIntensity=.7;rig.setNight(night);},[night,shipModel,rig]);
  useEffect(()=>()=>rig.dispose(),[rig]);
  const movingShip=useRef<Group>(null);
  const actorShadows=useRef<(Group|null)[]>([]);
  useLayoutEffect(()=>{
    const box=new Box3().setFromObject(car!.scene),size=box.getSize(new Vector3());rig.model.scale.set(1.8/size.x,1,4.5/size.z);
  },[car,rig]);
  useFrame(()=>{
    const seconds=replay.read().seconds,phase=crossingPhase(seconds);
    const carStart=-90,stop=-36,radius=6,corner=southboundRightLane.points[0]![0]-radius,arc=Math.PI*radius/2;
    const travel=phase<27?stop-carStart+phase*1.38:phase<34?stop-carStart+27*1.38+(phase-27)*1.38:(stop-carStart)*Math.min(1,(phase-34)/22);
    // A right turn joins Market Avenue to the southbound lane.
    const bend=Math.max(0,travel-(corner-carStart)),angle=Math.min(Math.PI/2,bend/radius);
    const carX=bend>0?corner+radius*Math.sin(angle):carStart+travel;
    const carZ=marketRightLane.points[0]![1]+radius*(1-Math.cos(angle))+Math.max(0,bend-arc);
    rig.model.visible=trafficAt(day,seconds).vehicleCount>0 && carZ<42;
    rig.model.position.set(carX,groundHeight(carX,carZ)+.045,carZ);rig.model.rotation.y=Math.PI/2-angle;rig.poseWheels(travel,0);
    const count=stepsAt(day,seconds).pedestrianCount;
    people.forEach((person,i)=>{
      person.visible=i<count;
      const progress=Math.min(1,Math.max(0,(phase-61)/16));
      const reverse=Math.floor(seconds/(signalCycle*5))%2===1;
      const u=reverse?1-progress:progress,z=i===0?8.8+18.4*u:27.2-18.4*u;
      const x=-31.4+i*1.0;
      person.position.set(x,groundHeight(x,z)+(u===0||u===1?.17:.055),z);person.rotation.y=Boolean(i)!==reverse?Math.PI:0;
      const swing=phase>=61&&phase<=77?Math.sin(u*Math.PI*16)*.36:0;
      for(const [j,side] of ["left","right"].entries()){
        const thigh=person.getObjectByName(side+"-thigh"),shoulder=person.getObjectByName(side+"-shoulder");
        if(thigh)thigh.rotation.x=swing*(j?1:-1);
        if(shoulder)shoulder.rotation.x=swing*(j?-1:1);
      }
    });
    for(const [i,model] of [rig.model,...people].entries()){
      const shadow=actorShadows.current[i];if(shadow){shadow.visible=model.visible;shadow.position.set(model.position.x,model.position.y+.018,model.position.z);}
    }
    const pose=boatPose(seconds);movingShip.current!.position.set(sliceBerth.x-blockOffsetX,pose.y,sliceBerth.z);
    movingShip.current!.rotation.set(pose.pitch,sliceBerth.yaw,pose.roll);
  });
  const carSpot=useMemo<ShadowSpot[]>(()=>[[0,0,0,5.3,2.9,.25]],[]);
  const personSpot=useMemo<ShadowSpot[]>(()=>[[0,0,0,1.3,.9,.25]],[]);
  return <><primitive object={rig.model} dispose={null}/>{people.map(p=><primitive key={p.uuid} object={p} dispose={null}/>)}
    {[carSpot,personSpot,personSpot].map((spots,i)=><group ref={o=>{actorShadows.current[i]=o;}} key={i}><Contacts spots={spots}/></group>)}
    <group ref={movingShip}><primitive object={shipModel.root} dispose={null}/></group>
  </>;
}
