import { useEffect,useMemo } from "react";
import { useFrame,useLoader } from "@react-three/fiber";
import { Bone,Float32BufferAttribute,Group,Mesh,Skeleton,SkinnedMesh,Uint16BufferAttribute,Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Replay } from "../../core/replay.ts";
import { footfall } from "../walk-gait.ts";
import { DRY_LAYER } from "../ocean/layers.ts";
import { captainAt } from "./captain.ts";
import { SYNTHETIC_SESSION as session } from "./session.ts";
import { companionState,dolphinAt,previewCompanion } from "./wildlife.ts";

function captainRig(source:Mesh){
  const geometry=source.geometry.clone(),joint=geometry.getAttribute("_joint");
  const weights=[],indices=[];
  for(let i=0;i<joint.count;i++){indices.push(joint.getX(i),0,0,0);weights.push(1,0,0,0);}
  geometry.setAttribute("skinIndex",new Uint16BufferAttribute(indices,4));
  geometry.setAttribute("skinWeight",new Float32BufferAttribute(weights,4));
  const model=new SkinnedMesh(geometry,source.material),root=new Group(),bones:Bone[]=[];
  function bone(parent:number,x:number,y:number,z:number){
    const b=new Bone();b.position.set(x,y,z);(bones[parent]??model).add(b);bones.push(b);
  }
  bone(-1,0,0,0);bone(0,0,1.45,0);
  for(const s of [-1,1]){bone(0,s*.126,.89,0);bone(bones.length-1,0,-.41,0);}
  for(const s of [-1,1]){bone(0,s*.216,1.37,0);bone(bones.length-1,s*.03,-.26,.014);}
  model.bind(new Skeleton(bones));model.layers.set(DRY_LAYER);model.frustumCulled=false;
  root.name="Voyage captain";model.name="Articulated captain";root.add(model);
  return {model,root,bones,dispose(){geometry.dispose();model.skeleton.dispose();}};
}
export function Captain({offset,replay}:{offset:number|null;replay:Replay}){
  const {scene}=useLoader(GLTFLoader,"/models/harbor-fleet.glb");
  const rig=useMemo(()=>captainRig(scene.getObjectByName("Captain") as Mesh),[scene]);
  const fixed=useMemo(()=>new Vector3(),[]);
  useEffect(()=>()=>rig.dispose(),[rig]);
  useFrame(()=>{
    const t=offset===null?0:offset+replay.read().seconds;
    const state=captainAt(session,t,previewCompanion),{action}=state,{root,bones}=rig;
    const ship=root.parent!;
    root.position.fromArray(state.position);root.rotation.set(0,state.yaw,0);
    if(action==="walk" && state.to==="ladder-lip")root.rotation.y=Math.PI/2;
    if(state.ashore){
      ship.updateWorldMatrix(true,false);
      fixed.fromArray(state.position);
      if(state.from.startsWith("jetty-")||state.to.startsWith("jetty-")){fixed.x=-fixed.x;fixed.z=-fixed.z;}
      fixed.x+=ship.position.x;fixed.z+=ship.position.z;
      root.position.lerp(ship.worldToLocal(fixed),state.ashore);
      root.rotation.x=-ship.rotation.x*state.ashore;root.rotation.z=-ship.rotation.z*state.ashore;
    }
    bones[0]!.position.y=action==="seat"?-.32:0;
    bones[0]!.rotation.x=action==="line"?.28+.14*Math.sin(t/24):0;
    bones[1]!.rotation.y=(action==="seat"?.24:.12)*Math.sin(t/270);
    const c=action==="point"?companionState(session,t):null;
    const surfacing=c&&(c.kind==="whale"?c.surface>.12||c.breach>0:c.kind==="ray"?Math.abs(c.wing)>.24||Math.sin(c.roll)>.5:
      c.kind==="shark"?Math.cos(c.a*1.2)>.45:dolphinAt(Math.floor(c.a*2)%6,c.a,c.side).leap>.4);
    for(let i=0;i<2;i++){
      const phase=i*.5,step=footfall(state.distance,1.03,phase),wave=Math.sin(2*Math.PI*(state.distance/1.03+phase));
      const walk=action==="walk",look=action==="watch",hand=i===1&&surfacing;
      bones[2+i*2]!.rotation.x=action==="seat"?-1.5:walk?-.44*wave:0;
      bones[3+i*2]!.rotation.x=action==="seat"?1.48:walk?step.lift*9:0;
      bones[6+i*2]!.rotation.x=look?-.76:hand?-1.5:walk?.34*wave:action==="line"||action==="anchor"?-.85+.4*Math.sin(t/22):-.27;
      bones[7+i*2]!.rotation.x=look?-1.72:hand?-.09:action==="wheel"||action==="seat"?-.98:-.22;
    }
    const glasses=root.getObjectByName("Binoculars");if(glasses)glasses.visible=action==="watch";
    root.userData.station=state.station;root.userData.action=action;
  });
  return <primitive object={rig.root} dispose={null}><group name="Binoculars" visible={false} position={[0,1.62,.23]}>
    {[-.066,.066].map(x=><mesh key={x} position-x={x} rotation-x={Math.PI/2}><cylinderGeometry args={[.047,.055,.15,8]}/><meshStandardMaterial color="#293a41"/></mesh>)}
  </group></primitive>;
}
