import {cityLight} from "../lighting.ts";
import { useOverview } from "./OverviewModel.tsx";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, InstancedMesh, Object3D, PointLight, Vector3 } from "three";
import { lampColor, lampHead, useLampFixture } from "../StreetLamp.tsx";
import { DRY_LAYER } from "../ocean/layers.ts";
import { surfaceHeight } from "./terrain.ts";

export type LampSite = { x:number; z:number; yaw:number; scale:number };

function lightPoolGeometry(sites:LampSite[]) {
  const vertices:number[]=[], colors:number[]=[], indices:number[]=[];
  for (const {x,z,yaw,scale} of sites) {
    const dx=Math.sin(yaw), dz=Math.cos(yaw), first=vertices.length/3;
    for (const [radius,brightness] of [[0,.14],[.35,.087],[.68,.022],[1,0]] as const) {
      for (let i=0;i<20;i++) {
        const a=i*Math.PI/10, along=(1.6+radius*Math.cos(a)*2.4)*scale, across=radius*Math.sin(a)*2.9*scale;
        const px=x+dx*along+dz*across, pz=z+dz*along-dx*across;
        vertices.push(px,surfaceHeight(px,pz)+.20,pz);
        colors.push(brightness,brightness,brightness);
      }
    }
    for(let ring=0;ring<3;ring++)for(let i=0;i<20;i++){
      const a=first+ring*20+i,b=first+ring*20+(i+1)%20;
      if(ring>0)indices.push(a,b+20,b);
      indices.push(a,a+20,b+20);
    }
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute("position",new Float32BufferAttribute(vertices,3));
  geometry.setAttribute("color",new Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);
  return geometry;
}

function NightLighting({sites,focus}:{sites:LampSite[];focus:RefObject<Vector3>}) {
  const overview=useOverview();
  const pool=useMemo(()=>lightPoolGeometry(sites),[sites]);
  const heads=useMemo(()=>sites.map(({x,z,yaw,scale})=>new Vector3(
    x+Math.sin(yaw)*lampHead[2]*scale,surfaceHeight(x,z)+.16+lampHead[1]*scale,z+Math.cos(yaw)*lampHead[2]*scale
  )),[sites]);
  const lights=useRef<(PointLight|null)[]>([]),last=useRef(new Vector3(Infinity,0,0));
  useLayoutEffect(()=>{last.current.set(Infinity,0,0);},[heads,overview]);
  useLayoutEffect(()=>()=>pool.dispose(),[pool]);
  useFrame(()=>{
    if(overview || last.current.distanceToSquared(focus.current)<1)return;
    last.current.copy(focus.current);
    const ranked=heads.map((head,i)=>({head,i,d:head.distanceToSquared(focus.current)})).sort((a,b)=>a.d-b.d);
    lights.current.forEach((light,j)=>{
      if(!light)return;
      const {head,i}=ranked[j]!, scale=sites[i]!.scale;
      light.position.copy(head);
      light.intensity=19*scale**2;
      light.distance=6.8*scale;
    });
  });
  return <>
    <mesh geometry={pool} layers-mask={1<<DRY_LAYER} renderOrder={1}>
      <meshBasicMaterial vertexColors color={lampColor} transparent blending={AdditiveBlending} depthWrite={false}/>
    </mesh>
    {Array.from({length:overview?0:Math.min(12,sites.length)},(_,i)=>
      <pointLight key={i} ref={light=>{lights.current[i]=light;}} color={lampColor}/>)}
  </>;
}

export function CityStreetLamps({sites,night,focus}:{sites:LampSite[];night:boolean;focus:RefObject<Vector3>}) {
  const illumination=(night?cityLight.night:cityLight.day).streetLamps;
  const {housing,lens}=useLampFixture();
  const poles=useRef<InstancedMesh>(null), lenses=useRef<InstancedMesh>(null);
  useLayoutEffect(()=>{
    const object=new Object3D();
    sites.forEach(({x,z,scale,yaw},i)=>{
      object.position.set(x,surfaceHeight(x,z)+.16,z);
      object.rotation.y=yaw;
      object.scale.setScalar(scale);
      object.updateMatrix();
      poles.current!.setMatrixAt(i,object.matrix);
      lenses.current!.setMatrixAt(i,object.matrix);
    });
    for(const mesh of [poles.current!,lenses.current!]){
      mesh.instanceMatrix.needsUpdate=true;
      mesh.computeBoundingSphere();
    }
  },[sites]);
  return <group name="City street lamps">
    <instancedMesh ref={poles} args={[housing,undefined,sites.length]} layers-mask={1<<DRY_LAYER} castShadow receiveShadow>
      <meshStandardMaterial color="#43514c" roughness={.76}/>
    </instancedMesh>
    <instancedMesh ref={lenses} args={[lens,undefined,sites.length]} layers-mask={1<<DRY_LAYER}>
      <meshStandardMaterial color="#e0cbaa" emissive={lampColor} emissiveIntensity={2*illumination}/>
    </instancedMesh>
    {illumination>0&&<NightLighting sites={sites} focus={focus}/>}
  </group>;
}
