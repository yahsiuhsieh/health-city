import { OverviewModel, useOverview } from "./city/OverviewModel.tsx";
import {BackgroundBuildings} from "./city/BackgroundBuildings.tsx";
import {assembleInterim} from "./city/interim-buildings.ts";
import {plotState} from "./city/interim-layout.ts";
import type {Building} from "./city/building-assembler.ts";
const noBuildings:Building[]=[];
import { TRANSPARENT_MASK } from "./ocean/layers.ts";
import { useEffect, useMemo, useRef } from "react";
import { useLoader } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { surfaceHeight } from "./city/terrain.ts";
import { BoxGeometry, EdgesGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { HrvSkyline } from "../core/skyline.ts";
import {  SKYLINE_PLOTS, TOWER_ASSETS, TOWER_DESIGNS, skylineDisplay } from "./skyline-layout.ts";
import type { TowerDesignId } from "./skyline-layout.ts";
import { FLOOR_HEIGHT } from "./tower-designs.ts";

const envelopeGeometry=new EdgesGeometry(new BoxGeometry(1,1,1));

type TowerPlacement = {x:number; z:number; yaw:number; height:number; base:number};

function TowerInstance({model,design,placements}:{model:Group;design:TowerDesignId;placements:TowerPlacement[]}) {
  const tower=useMemo(()=>{
    const group=new Group(), transform=new Object3D(), origin=new Matrix4();
    const floors=new Map<string,Matrix4[]>();
    for(const site of placements){
      origin.makeRotationY(site.yaw).setPosition(site.x,site.base,site.z);
      const count=Math.round(site.height/FLOOR_HEIGHT);
      for(let i=0;i<count;i++){
        const kind=i===0?"lobby":i<3?"podium":i===count-1?"crown":i===count-2?"mechanical":
          i%3===0?"setback-floor":"typical-floor";
        const setback=design==="deco"&&i>=count*.8?.71:design==="deco"&&i>=count*.6?.86:1;
        const shaft=kind==="typical-floor"||kind==="setback-floor";
        transform.position.y=i*FLOOR_HEIGHT;
        transform.rotation.y=design==="ribbon"&&i>=3?(i-3)*Math.PI/120:
          shaft&&design!=="concrete"?Math.PI*(i%4)/2:0;
        transform.scale.set(setback,1,setback);transform.updateMatrix();
        const batch=floors.get(kind)??[];
        batch.push(transform.matrix.clone().premultiply(origin));floors.set(kind,batch);
      }
    }
    for(const [kind,matrices] of floors){
      model.getObjectByName(kind)!.traverse(part=>{
        if(!(part instanceof Mesh))return;
        const batch=new InstancedMesh(part.geometry,part.material,matrices.length);
        matrices.forEach((matrix,index)=>batch.setMatrixAt(index,matrix));
        batch.castShadow=batch.receiveShadow=true;group.add(batch);
      });
    }
    return group;
  },[model,design,placements]);
  useEffect(()=>()=>tower.children.forEach(child=>(child as InstancedMesh).dispose()),[tower]);
  return <OverviewModel model={tower}/>;
}

export function SkylineDistrict({ night, hrv, focus, onReady, onSelect, onPlot, sites=SKYLINE_PLOTS }: {
  night: boolean;
  hrv: HrvSkyline;
  focus: TowerDesignId | null;
  sites?:(typeof SKYLINE_PLOTS[number] & {envelope?:[number,number,number]})[]; onPlot:(id:number)=>void;
  onReady: () => void;
  onSelect: (design: TowerDesignId) => void;
}) {
  const gltfs = useLoader(GLTFLoader, TOWER_ASSETS);
  const models = useMemo(() => gltfs.map(gltf => {
    const scene = gltf.scene.clone(true);
    const materials=new Map<MeshStandardMaterial,MeshStandardMaterial>();
    scene.traverse(child=>{
      if(!(child instanceof Mesh))return;
      const source=child.material as MeshStandardMaterial;
      if(!materials.has(source))materials.set(source,source.clone());
      child.material=materials.get(source)!;
    });
    return {scene,materials};
  }),[gltfs]);
  useEffect(()=>{
    for(const {materials} of models)for(const [source,copy] of materials){
      copy.emissive.set(night && source.name==="tower-window-lit"?"#ffd59a":"#000000");
      copy.emissiveIntensity=.7;
    }
  },[models,night]);
  useEffect(() => onReady(), [onReady]);
  useEffect(()=>()=>models.forEach(({materials})=>materials.forEach(m=>m.dispose())),[models]);
  const pointerDown = useRef<[number, number] | null>(null);
  const inspect = (event: ThreeEvent<MouseEvent>, design: TowerDesignId) => {
    event.stopPropagation();
    const down = pointerDown.current;
    if (down && Math.hypot(event.clientX - down[0], event.clientY - down[1]) < 5) onSelect(design);
    pointerDown.current = null;
  };
  const display = skylineDisplay(hrv);
  const count=hrv.status==="available"?display.visibleCount:null;
  const landscape=useMemo(()=>sites.flatMap(site=>{
    if(focus && site.id<5 && site.design.id===focus)return [];
    const state=plotState(site.id,count);
    return state==="tower"?[]:assembleInterim(site,night,state==="wireframe",sites!==SKYLINE_PLOTS);
  }),[sites,count,night,focus]);
  const overview=useOverview();
  const towers=useMemo(()=>TOWER_DESIGNS.flatMap((design,family)=>{
    const occupied=sites.filter(site=>site.design.id===design.id &&
      (focus ? focus===design.id && site.id<5 : plotState(site.id,count)==="tower"));
    const groups=overview?[occupied]:occupied.map(site=>[site]);
    return groups.filter(group=>group.length).map(group=>({
      key:overview?design.id:String(group[0]!.id),family,design:design.id,
      placements:group.map(site=>({x:site.x,z:site.z,yaw:site.yaw,height:site.envelope?.[1]??site.height,
        base:surfaceHeight(site.x,site.z)+.07})),
    }));
  }),[sites,focus,count,overview]);
  return <group name="HRV skyline">
    {towers.map(tower=><group key={"tower/"+tower.key} name={"HRV tower "+tower.key}
      onPointerDown={event=>{pointerDown.current=[event.clientX,event.clientY]}}
      onClick={event=>inspect(event,tower.design)}>
      <TowerInstance model={models[tower.family]!.scene} design={tower.design} placements={tower.placements}/>
    </group>)}
    {landscape.length>0&&<BackgroundBuildings night={night} buildings={noBuildings} landscape={landscape} onPlot={onPlot}/>}
    {(focus?sites.slice(0,5):sites).map(({ id, x, z, yaw, design, height, envelope }) => {
      if (focus && focus !== design.id) return null;
      const state=focus?"tower":plotState(id,count);
      if(state!=="wireframe")return null;
      const floor=surfaceHeight(x,z)+.07;
      const dimensions=envelope??[19.6,height,19.6];
      return <group key={id} name={"HRV plot " + id} position={[x, floor, z]} rotation-y={yaw}
        onPointerDown={event => { pointerDown.current = [event.clientX, event.clientY]; }}
        onClick={event => {if(event.delta<5){event.stopPropagation();onPlot(id);}}}>
        <lineSegments name="HRV unavailable plot" geometry={envelopeGeometry} layers-mask={TRANSPARENT_MASK} position={[0,dimensions[1]/2,0]} scale={dimensions}>
          <lineBasicMaterial transparent opacity={.63} color={night?"#baccc8":"#657d7c"}/>
        </lineSegments>
      </group>;
    })}
  </group>;
}
