import {useOverview} from "./OverviewModel.tsx";
import {useOcean} from "../ocean/OceanEnvironment.tsx";
import {DRY_LAYER} from "../ocean/layers.ts";
import {useEffect,useLayoutEffect,useMemo,useRef} from "react";
import {useLoader} from "@react-three/fiber";
import {BatchedMesh,Color,Group,InstancedMesh,Mesh,MeshStandardMaterial,Object3D} from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {assembleBlock,frontage} from "./building-assembler.ts";
import type {Building,Placement} from "./building-assembler.ts";

function place(o:Object3D,item:Placement){
  o.position.fromArray(item.at);o.rotation.y=item.yaw;o.scale.fromArray(item.size);o.updateMatrix();
  if(item.grade){
    // Follow the east-west slope only on ground surfaces.
    const e=o.matrix.elements;
    e[1]+=item.grade*e[0];e[5]+=item.grade*e[4];e[9]+=item.grade*e[8];
  }
}

// The city kit shares one opaque material. Keep per-placement colors and plot picking.
function OverviewBuildings({groups,onPlot}:{groups:{source:Mesh;items:Placement[]}[];onPlot?:(id:number)=>void}){
  const root=useRef<Group>(null),plotIds=useRef<(number|undefined)[]>([]);
  useLayoutEffect(()=>{
    const container=root.current!;
    const vertices=groups.reduce((n,g)=>n+g.source.geometry.getAttribute("position").count,0);
    const indices=groups.reduce((n,g)=>n+(g.source.geometry.index?.count??0),0);
    const count=groups.reduce((n,g)=>n+g.items.length,0);
    const mesh=new BatchedMesh(count,vertices,indices,groups[0]!.source.material as MeshStandardMaterial);
    const pose=new Object3D(),color=new Color(),plots:(number|undefined)[]=[];
    mesh.layers.set(DRY_LAYER);mesh.castShadow=mesh.receiveShadow=true;
    mesh.sortObjects=false;
    for(const {source,items} of groups){
      const geometry=mesh.addGeometry(source.geometry);
      for(const item of items){
        const id=mesh.addInstance(geometry);
        place(pose,item);mesh.setMatrixAt(id,pose.matrix);mesh.setColorAt(id,color.set(item.color));
        plots[id]=item.plotId;
      }
    }
    mesh.computeBoundingSphere();
    container.add(mesh);plotIds.current=plots;
    return ()=>{container.remove(mesh);mesh.dispose();};
  },[groups]);
  return <group ref={root} onClick={onPlot?(e:import("@react-three/fiber").ThreeEvent<MouseEvent>)=>{
    const plot=plotIds.current[e.batchId??-1];
    if(plot!==undefined){e.stopPropagation();if(e.delta<5)onPlot(plot);}
  }:undefined}/>;
}
function Batch({source,items,onPlot}:{source:Mesh;items:Placement[];onPlot?:(id:number)=>void}) {
  const ref=useRef<InstancedMesh>(null);
  const ocean=useOcean();
  const material=useMemo(()=>{
    if(source.name==="lit-glazing")return new MeshStandardMaterial({color:"#ffd9a0",emissive:"#ffd9a0",emissiveIntensity:.7});
    if(!/tree-|pine-/.test(source.name))return source.material;
    const leaves=(source.material as MeshStandardMaterial).clone();
    leaves.onBeforeCompile=shader=>{
      shader.uniforms.canopyTime=ocean.uniforms.oceanTime;
      shader.vertexShader="uniform float canopyTime;\n"+shader.vertexShader.replace("#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.x += max(position.y-2.,0.)*.01745*sin(canopyTime*.7+instanceMatrix[3].x*.45);");
    };
    return leaves;
  },[source,ocean]);
  useEffect(()=>()=>{if(material!==source.material && material instanceof MeshStandardMaterial)material.dispose();},[source,material]);
  useLayoutEffect(()=>{
    const mesh=ref.current!,o=new Object3D(),color=new Color();
    items.forEach((item,i)=>{
      place(o,item);
      mesh.setMatrixAt(i,o.matrix);
      color.set(item.color);
      if(/tree-|pine-|shrub-/.test(source.name))color.multiplyScalar(1+.06*Math.sin(item.at[0]*13+item.at[2]*7));
      mesh.setColorAt(i,color);
    });
    mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.computeBoundingSphere();
  },[items,source]);
  return <instancedMesh layers-mask={1<<DRY_LAYER} ref={ref} args={[source.geometry,material,items.length]} castShadow receiveShadow
    onClick={onPlot ? event=>{
      const item=items[event.instanceId??-1];
      if(item?.plotId===undefined)return;
      event.stopPropagation();
      if(event.delta<5)onPlot(item.plotId);
    }:undefined}/>;
}
export function BackgroundBuildings({night,landscape,buildings=frontage,onPlot}:{night:boolean;landscape:Placement[];buildings?:Building[];onPlot?:(id:number)=>void}) {
  const [kit,flora]=useLoader(GLTFLoader,["/models/city-kit.glb","/models/city-flora.glb"]);
  const overview=useOverview();
  const batches=useMemo(()=>{
    const grouped=new Map<string,Placement[]>();
    for(const item of [...assembleBlock(buildings,night),...landscape]){
      if (overview && (item.module==="manhole" || item.module==="hydrant" ||
        (item.module==="wall" && Math.max(...item.size)<1))) continue;
      const seed=Math.abs(Math.round(item.at[0]*13+item.at[2]*31));
      const roof=overview && item.module.startsWith("roof-equipment-");
      const name=roof?"roof-vent":item.module!=="street-tree"?item.module:item.plotId!==undefined?"park-tree-"+["a","b","c"][seed%3]:
        "street-tree-"+(seed%2?"a":"b");
      const batch=grouped.get(name)??[];batch.push(item);grouped.set(name,batch);
    }
    const staticKit:{source:Mesh;items:Placement[]}[]=[],other:{source:Mesh;items:Placement[]}[]=[];
    for(const [name,items] of grouped){
      const plant=flora!.scene.getObjectByName(name);
      const source=(plant??kit!.scene.getObjectByName(name)) as Mesh;
      const list=overview&&!plant&&name!=="lit-glazing"?staticKit:other;
      list.push({source,items});
    }
    return {staticKit,other};
  },[night,landscape,buildings,overview,kit,flora]);
  return <group name="Street walls and gardens">
    {batches.staticKit.length>0&&<OverviewBuildings groups={batches.staticKit} onPlot={onPlot}/>}
    {batches.other.map(({source,items})=><Batch key={source.name+"/"+items.length} source={source} items={items} onPlot={onPlot}/>)}
  </group>;
}
