import { useMemo,useEffect } from "react";
import { useFrame,useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Group, InstancedBufferAttribute,InstancedMesh,Mesh,MeshDepthMaterial,MeshStandardMaterial,Object3D,RGBADepthPacking,Vector3 } from "three";
import type { Replay } from "../../core/replay.ts";
import { useOcean } from "../ocean/OceanEnvironment.tsx";
import { DRY_LAYER,SEABED_LAYER,WATER_LEVEL } from "../ocean/layers.ts";
import { patchSand } from "../ocean/sand-material.ts";
import { voyage } from "../sleep-voyage.ts";
import { SYNTHETIC_SESSION } from "./session.ts";
import { channelBanks } from "./ChannelBanks.tsx";
import { sleepLayout,type Prop } from "./layout.ts";
import { patchReveal } from "./reveal-material.ts";

export function StageEnvironments({follow,offset,replay}:{follow:boolean;offset:number;replay:Replay}){
  const ocean=useOcean(), model=useLoader(GLTFLoader,"/models/sleep-world.glb");
  const uniforms=useMemo(()=>({...ocean.uniforms,uBoat:{value:new Vector3()},uEye:{value:new Vector3()},uFollow:{value:0}}),[ocean]);
  const group=useMemo(()=>{
    const root=new Group(),layout=sleepLayout(SYNTHETIC_SESSION);
    root.add(channelBanks(layout.channels,uniforms));
    const variants=new Map<string,Prop[]>();
    for(const p of layout.props){const batch=variants.get(p.variant)??[];batch.push(p);variants.set(p.variant,batch);}
    for(const [name,props] of variants){
      const asset=model.scene.getObjectByName(name);
      if(!(asset instanceof Mesh) || !(asset.material instanceof MeshStandardMaterial))throw Error("Missing sleep asset "+name);
      const g=asset.geometry.clone(),mat=asset.material.clone(),depth=new MeshDepthMaterial({depthPacking:RGBADepthPacking});
      const underwater=props[0]!.top!==undefined || name.startsWith("seagrass"),tree=name.startsWith("tree-"),grass=name.startsWith("reed")||name.startsWith("seagrass");
      patchReveal(mat,uniforms,tree,grass);patchReveal(depth,uniforms,tree,grass);
      if(underwater){
        const baseKey=mat.customProgramCacheKey();mat.customProgramCacheKey=()=>baseKey+(name==="glow-anemone-a"?"-glow":"-submerged");
        const reveal=mat.onBeforeCompile.bind(mat);
        mat.onBeforeCompile=(shader,renderer)=>{
          reveal(shader,renderer);
          patchSand(shader,ocean);
          if(name==="glow-anemone-a")shader.fragmentShader=shader.fragmentShader.replace("#include <emissivemap_fragment>",
            "#include <emissivemap_fragment>\n totalEmissiveRadiance *= smoothstep(.25,.58,vColor.g-vColor.r);");
          shader.vertexShader=shader.vertexShader.replace("oceanPosition = (modelMatrix * vec4(transformed, 1.)).xyz;","oceanPosition = sleepWorld;");
        };
      }
      if(name==="glow-anemone-a"){
        mat.emissive.set("#65e8cc");
        mat.emissiveIntensity=.2;
      }
      g.computeBoundingBox();
      g.setAttribute("routeS",new InstancedBufferAttribute(new Float32Array(props.map(p=>p.routeS)),1));
      const mesh=new InstancedMesh(g,mat,props.length),dummy=new Object3D();
      mesh.name=name;mesh.castShadow=!underwater;mesh.receiveShadow=true;mesh.customDepthMaterial=depth;
      if(underwater)mesh.layers.set(SEABED_LAYER);else if(tree)mesh.layers.set(DRY_LAYER);
      props.forEach((p,i)=>{
        const floor=WATER_LEVEL-ocean.bed.depthAt(p.x,p.z);
        const seated=underwater||grass;
        dummy.position.set(p.x,seated?floor:p.y,p.z);dummy.rotation.y=p.yaw;dummy.scale.setScalar(p.scale);
        if(p.top!==undefined)dummy.scale.y=Math.max(.12,WATER_LEVEL+p.top-floor)/g.boundingBox!.max.y;
        dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      });
      mesh.computeBoundingSphere();root.add(mesh);
    }
    return root;
  },[model,ocean,uniforms]);
  useFrame(({camera})=>{
    uniforms.uEye.value.copy(camera.position);
    uniforms.uFollow.value=Number(follow);
    const ship=voyage(offset,replay.read().seconds);uniforms.uBoat.value.set(ship.x,2,ship.z);
    const glow=group.getObjectByName("glow-anemone-a") as InstancedMesh|undefined;
    if(glow)(glow.material as MeshStandardMaterial).emissiveIntensity=.2+ocean.uniforms.nightAmount.value;
  });
  useEffect(()=>()=>{for(const obj of group.children){
    if(obj instanceof Mesh){obj.geometry.dispose();obj.material.dispose();obj.customDepthMaterial?.dispose();if(obj instanceof InstancedMesh)obj.dispose();}
  }},[group]);
  return <primitive object={group}/>;
}
