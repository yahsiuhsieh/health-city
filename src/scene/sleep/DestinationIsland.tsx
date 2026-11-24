import { useEffect,useMemo } from "react";
import { useFrame,useLoader,type ThreeEvent } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { BoxGeometry,BufferGeometry,Color,CylinderGeometry,DoubleSide,Float32BufferAttribute,Group,InstancedMesh,Matrix4,Mesh,MeshDepthMaterial,MeshStandardMaterial,Object3D,RGBADepthPacking,Vector3,Frustum } from "three";
import { useOcean,type OceanEnvironment } from "../ocean/OceanEnvironment.tsx";
import { patchSand } from "../ocean/sand-material.ts";
import { DRY_LAYER,SEABED_LAYER,WATER_LEVEL } from "../ocean/layers.ts";
import { destination } from "./island-preview.ts";
import { islandMesh } from "./island-mesh.ts";
import { islandLayout,type Placement } from "./island-layout.ts";
import type { IslandTerrain } from "./island-shape.ts";
import { routeDistanceAt,returnDurations } from "./timeline.ts";
import { ROUTE_LENGTH } from "./route.ts";
import { elapsedSeconds,SYNTHETIC_SESSION } from "./session.ts";
import type { Replay } from "../../core/replay.ts";

function materials(ocean:OceanEnvironment,sand=false){
  const mat=new MeshStandardMaterial({vertexColors:true,roughness:.94,side:DoubleSide});
  const depth=new MeshDepthMaterial({depthPacking:RGBADepthPacking,side:DoubleSide});
  for(const material of [mat,depth]){
    material.customProgramCacheKey=()=>sand?"cay-sand":"cay-props";
    material.onBeforeCompile=shader=>{
      if(sand && material===mat)patchSand(shader,ocean,"sand",ocean.islandBed!);
      else shader.fragmentShader="uniform float uIslandReveal;\n"+shader.fragmentShader;
      shader.uniforms.uIslandReveal=ocean.uniforms.uIslandReveal;
      shader.fragmentShader=shader.fragmentShader.replace("#include <clipping_planes_fragment>",
        "#include <clipping_planes_fragment>\n if(uIslandReveal<=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715)))))discard;");
    };
  }
  return {mat,depth};
}

// At island overview scale a colony spans a few pixels. Preserve its palette and
// footprint with a faceted crown. Close views use the detailed GLB meshes.
function colonyCrown(src:BufferGeometry,name:string){
  const color=src.getAttribute("color"),tint=new Color(0,0,0);
  for(let i=0;i<color.count;i++){tint.r+=color.getX(i);tint.g+=color.getY(i);tint.b+=color.getZ(i);}
  tint.multiplyScalar(1/color.count);
  const pos:number[]=[],rgb:number[]=[],indices:number[]=[];
  const table=name.includes("table")||name.includes("plate");
  for(const [r,h] of [[table?.18:.37,0],[.5,table?.40:.23],[.25,table?.53:.50]]){
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2;
      pos.push(r!*Math.cos(a),h!,r!*Math.sin(a));rgb.push(tint.r,tint.g,tint.b);
    }
  }
  for(let i=0;i<4;i++){
    const j=(i+1)%4;for(const k of [0,4])indices.push(k+i,k+i+4,k+j,k+j,k+i+4,k+j+4);
    if(i>=2)indices.push(8,8+i,8+i-1);
  }
  const g=new BufferGeometry();g.setAttribute("position",new Float32BufferAttribute(pos,3));
  g.setAttribute("color",new Float32BufferAttribute(rgb,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function islandModel(land:IslandTerrain,assets:Group,ocean:OceanEnvironment){
  const root=new Group(),dummy=new Object3D(),props=materials(ocean),sand=materials(ocean,true);
  const owned:BufferGeometry[]=[],batches:InstancedMesh[]=[];
  const ground=islandMesh(land);owned.push(ground);
  function mount(mesh:Mesh,wet:boolean,depth:MeshDepthMaterial){
    mesh.customDepthMaterial=depth;mesh.castShadow=!wet;mesh.receiveShadow=true;
    mesh.layers.set(wet?SEABED_LAYER:DRY_LAYER);root.add(mesh);
  }
  const terrain=new Mesh(ground,sand.mat);terrain.name="Coral cay";mount(terrain,false,sand.depth);
  const groups=new Map<string,Placement[]>();
  for(const item of islandLayout(land)){
    const items=groups.get(item.name);
    if(items)items.push(item);else groups.set(item.name,[item]);
  }
  const detailBatches:{mesh:InstancedMesh;matrices:Matrix4[];centers:Vector3[];colony:boolean;radius:number}[]=[],distant:InstancedMesh[]=[];
  for(const [name,items] of groups){
    const geom=(assets.getObjectByName(name) as Mesh).geometry;
    const wet=items[0]!.wet,colony=wet && name!=="bommie-a";
    const detail=new InstancedMesh(geom,props.mat,items.length);detail.name=name;
    const lowGeometry=colony?colonyCrown(geom,name):null;
    const low=lowGeometry?new InstancedMesh(lowGeometry,props.mat,items.length):null;
    if(lowGeometry)owned.push(lowGeometry);
    geom.computeBoundingBox();
    const extent=geom.boundingBox!.getSize(new Vector3());
    const matrices:Matrix4[]=[],centers:Vector3[]=[];
    const cull=colony || name.startsWith("broadleaf") || name.startsWith("palm");
    for(const [i,p] of items.entries()){
      dummy.position.set(p.x,p.y+WATER_LEVEL,p.z);dummy.rotation.y=p.yaw;dummy.scale.set(...p.scale);
      if(low){dummy.updateMatrix();low.setMatrixAt(i,dummy.matrix);}
      if(colony){
        const width=Math.max(extent.x,extent.z);
        dummy.scale.x/=width;dummy.scale.z/=width;dummy.scale.y*=.74/extent.y;
      }
      dummy.updateMatrix();detail.setMatrixAt(i,dummy.matrix);
      if(cull){matrices.push(dummy.matrix.clone());centers.push(dummy.position.clone());}
    }
    mount(detail,wet,props.depth);batches.push(detail);
    if(low){
      low.name=name+" overview";mount(low,true,props.depth);batches.push(low);distant.push(low);
    }
    if(cull){detail.frustumCulled=false;detailBatches.push({mesh:detail,matrices,centers,colony,radius:colony?3:18});}
  }
  const planks:BufferGeometry[]=[];
  const kit=(name:string,x:number,y:number,z:number,sx=1,sy=1,sz=1,yaw=0)=>{
    const geometry=(assets.getObjectByName("jetty-"+name+"-a") as Mesh).geometry;
    const g=geometry.index?geometry.toNonIndexed():geometry.clone();
    dummy.rotation.set(0,yaw,0);dummy.position.set(x,y+WATER_LEVEL,z);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();
    planks.push(g.applyMatrix4(dummy.matrix));
  };
  const [px,pz]=land.pier,[sx,sz]=land.shore;
  const dx=sx-px,dz=sz-pz,len=Math.hypot(dx,dz)+2,yaw=Math.atan2(dx,dz);
  const beachEnd=land.elevation(px+dx*len/(len-2),pz+dz*len/(len-2))+.09;
  const deckTop=(u:number)=>1.4+(beachEnd-1.4)*Math.max(0,(u-len+7)/7);
  const boards=Math.ceil(len/.31);
  for(let i=0;i<boards;i++){
    const u=(i+.5)*len/boards,deck=deckTop(u);
    kit("plank",px+dx*u/(len-2),deck-.09,pz+dz*u/(len-2),2.3,.18,len/boards-.012,yaw);
  }
  function pile(x:number,z:number,cap=1.32){
    const bottom=-ocean.islandBed!.depthAt(x,z)-.35;
    kit("pile",x,(cap+bottom)/2,z,1,cap-bottom,1);
  }
  for(let u=2;u<len;u+=4.3)for(const side of [-.82,.82]){
    pile(px+dx*u/(len-2)+Math.cos(yaw)*side,pz+dz*u/(len-2)-Math.sin(yaw)*side,deckTop(u)-.09);
  }
  for(let i=0;i<46;i++)kit("plank",px-7+(i+.5)*14/46,1.31,pz,14/46-.012,.18,3);
  for(const x of [-6.4,0,6.4])for(const z of [-1.05,1.05])pile(px+x,pz+z);
  for(const x of [-6.2,-2.6,2.6,6.2])kit("bollard",px+x,1.4,pz+.94);
  kit("ladder",px+7.05,1.4,pz,1,1,1,Math.PI/2);kit("lamp",px-6.3,1.4,pz-1.1);
  const jettyGeo=mergeGeometries(planks);owned.push(jettyGeo);planks.forEach(g=>g.dispose());
  const jetty=new Mesh(jettyGeo,props.mat);jetty.name="Timber T-head jetty";mount(jetty,false,props.depth);
  const lensGeo=new BoxGeometry(.306,.321,.306),lamp=materials(ocean);
  const lensColor=new Float32Array(lensGeo.attributes.position.count*3).fill(1);
  lensGeo.setAttribute("color",new Float32BufferAttribute(lensColor,3));owned.push(lensGeo);
  lamp.mat.color.set("#ffe5ae");lamp.mat.emissive.set("#ffd398");
  const lens=new Mesh(lensGeo,lamp.mat);lens.position.set(px-6.3,1.4+WATER_LEVEL+2.48,pz-1.1);
  lens.name="Jetty solar lamp";mount(lens,false,lamp.depth);
  const fenders=new Group();root.add(fenders);
  for(const x of [-5.1,-1.6,1.6,5.1]){
    const f=new Mesh((assets.getObjectByName("jetty-fender-a") as Mesh).geometry,props.mat);
    f.position.set(px+x,.56,pz+1.62);f.scale.set(1.25,1.25,1.22);mount(f,false,props.depth);fenders.add(f);
  }
  const cordGeo=new CylinderGeometry(.024,.024,1,5),cordColor=[];
  const hemp=new Color("#726750");
  for(let i=0;i<cordGeo.attributes.position.count;i++)cordColor.push(hemp.r,hemp.g,hemp.b);
  cordGeo.setAttribute("color",new Float32BufferAttribute(cordColor,3));owned.push(cordGeo);
  const cords=new InstancedMesh(cordGeo,props.mat,8);
  cords.frustumCulled=false;mount(cords,false,props.depth);batches.push(cords);
  const up=new Vector3(0,1,0),a=new Vector3(),b=new Vector3(),direction=new Vector3();
  function setFenders(slide:number){
    fenders.position.z=.60*slide;
    let i=0;
    for(const x of [-5.1,-1.6,1.6,5.1])for(const side of [-1,1]){
      a.set(px+x+.31*side,1.37,pz+1.4);b.set(px+x+.23*side,.86,pz+1.62+fenders.position.z);
      direction.subVectors(b,a);dummy.scale.set(1,direction.length(),1);
      dummy.quaternion.setFromUnitVectors(up,direction.normalize());dummy.position.lerpVectors(a,b,.5);
      dummy.updateMatrix();cords.setMatrixAt(i++,dummy.matrix);
    }
    cords.instanceMatrix.needsUpdate=true;
  }
  return {root,lamp:lamp.mat,setFenders,distant,detailBatches,dispose(){
    batches.forEach(m=>m.dispose());owned.forEach(g=>g.dispose());
    for(const {mat,depth} of [props,sand,lamp]){mat.dispose();depth.dispose();}
  }};
}
export function DestinationIsland({onIsland,offset,replay}:{onIsland:()=>void;offset:number;replay:Replay}){
  const ocean=useOcean(),assets=useLoader(GLTFLoader,"/models/sleep-world.glb");
  const model=useMemo(()=>islandModel(destination(),assets.scene,ocean),[assets,ocean]);
  const view=useMemo(()=>({matrix:new Matrix4(),previous:new Matrix4(),frustum:new Frustum()}),[model]);
  useFrame(({camera,size})=>{
    model.root.visible=ocean.uniforms.uIslandReveal.value>0;
    if(!model.root.visible)return;
    const t=offset+replay.read().seconds,{wait,sail}=returnDurations(),since=t-elapsedSeconds(SYNTHETIC_SESSION);
    let slide=Math.max(0,routeDistanceAt(SYNTHETIC_SESSION,t)-(ROUTE_LENGTH-1));
    if(since>=wait){const u=Math.min(1,(since-wait)/(.02*sail));slide=1-u*u*(3-2*u);}
    model.setFenders(slide);
    model.lamp.emissiveIntensity=ocean.uniforms.nightAmount.value*.9;
    const overview=size.width/camera.zoom>110;
    view.matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    if(view.matrix.equals(view.previous))return;
    view.previous.copy(view.matrix);view.frustum.setFromProjectionMatrix(view.matrix);
    for(const m of model.distant)m.visible=overview;
    for(const {mesh,centers,matrices,colony,radius} of model.detailBatches){
      mesh.visible=!overview || !colony;if(!mesh.visible)continue;
      mesh.count=0;
      for(let i=0;i<centers.length;i++){
        if(view.frustum.planes.every(p=>p.distanceToPoint(centers[i]!)>=-radius))mesh.setMatrixAt(mesh.count++,matrices[i]!);
      }
      mesh.instanceMatrix.needsUpdate=true;
    }
  });
  useEffect(()=>()=>model.dispose(),[model]);
  return <primitive object={model.root} name="Destination island" onClick={(e:ThreeEvent<MouseEvent>)=>{
    if(e.delta<5 && ocean.uniforms.uIslandReveal.value>=.99999){e.stopPropagation();onIsland();}
  }}/>;
}
