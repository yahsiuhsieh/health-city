import { useEffect,useMemo } from "react";
import { useFrame,useLoader } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { BoxGeometry,BufferGeometry,Color,CylinderGeometry,DoubleSide,Float32BufferAttribute,Group,Mesh,MeshDepthMaterial,MeshStandardMaterial,Object3D,Raycaster,RGBADepthPacking,Vector3 } from "three";
import { useOcean,type OceanEnvironment } from "../ocean/OceanEnvironment.tsx";
import { patchSand } from "../ocean/sand-material.ts";
import { DRY_LAYER,SEABED_LAYER,WATER_LEVEL } from "../ocean/layers.ts";
import { seededRandom } from "./random.ts";
import { SYNTHETIC_SESSION } from "./session.ts";
import { destination } from "./island-preview.ts";
import { islandMesh,lagoonWeight } from "./island-mesh.ts";
import { inside,type IslandCell,type IslandTerrain } from "./island-shape.ts";

function islandMaterial(ocean:OceanEnvironment,glow=false){
  const mat=new MeshStandardMaterial({vertexColors:true,roughness:.92,side:DoubleSide});
  const depth=new MeshDepthMaterial({depthPacking:RGBADepthPacking,side:DoubleSide});
  for(const material of [mat,depth]){
    material.customProgramCacheKey=()=>"destination-"+glow;
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,ocean.uniforms);
      if(material===mat){patchSand(shader,ocean);
        if(glow)shader.fragmentShader=shader.fragmentShader.replace("#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\n totalEmissiveRadiance+=vec3(.13,.56,.43)*smoothstep(.22,.57,vColor.g-vColor.r)*(.14+1.2*nightAmount);");
      }
      shader.fragmentShader=(material===mat?"":"uniform float uIslandReveal;\n")+shader.fragmentShader.replace("#include <clipping_planes_fragment>",
        "#include <clipping_planes_fragment>\n if(uIslandReveal<=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715)))))discard;");
    };
  }
  return {mat,depth};
}

function islandModel(land:IslandTerrain,assets:Group,ocean:OceanEnvironment){
  const root=new Group(),random=seededRandom(SYNTHETIC_SESSION.id,"island-garden"),matrix=new Object3D();
  const ground=new Mesh(islandMesh(land)),ray=new Raycaster(),down=new Vector3(0,-1,0);
  const planted:Record<string,number>={};
  function surface(x:number,z:number){
    ray.set(new Vector3(x,12,z),down);
    return ray.intersectObject(ground,false)[0]?.point.y??0;
  }
  function attach(g:BufferGeometry,name:string,glow=false,underwater=false){
    const {mat,depth}=islandMaterial(ocean,glow),m=new Mesh(g,mat);m.name=name;
    m.customDepthMaterial=depth;m.castShadow=!underwater;m.receiveShadow=true;
    m.layers.set(underwater?SEABED_LAYER:DRY_LAYER);root.add(m);
  }
  attach(ground.geometry,"Island terrain");
  const dry:BufferGeometry[]=[],glowing:BufferGeometry[]=[],submerged:BufferGeometry[]=[];
  function place(geometry:BufferGeometry,x:number,y:number,z:number,yaw:number,scale:[number,number,number],color:string|undefined,target:BufferGeometry[]){
    const g=geometry.index?geometry.toNonIndexed():geometry.clone();g.deleteAttribute("uv");
    if(color){const rgb=new Color(color),v=[];for(let i=0;i<g.attributes.position!.count;i++)v.push(rgb.r,rgb.g,rgb.b);g.setAttribute("color",new Float32BufferAttribute(v,3));}
    matrix.position.set(x,y,z);matrix.rotation.y=yaw;matrix.scale.set(...scale);matrix.updateMatrix();g.applyMatrix4(matrix.matrix);target.push(g);
  }
  function plant(name:string,x:number,z:number,size:number,y=surface(x,z),wet=false){
    const src=assets.getObjectByName(name) as Mesh;planted[name]=(planted[name]??0)+1;
    place(src.geometry,x,y,z,random()*Math.PI*2,[size,size,size],undefined,wet?submerged:name.startsWith("glow")?glowing:dry);
  }
  const {pier,shore,f}=land,box=new BoxGeometry(),post=new CylinderGeometry(1,1,1,8),disk=new CylinderGeometry(1,1,1,20);
  const timber=(u:number,v:number,h:number,scale:[number,number,number],col:string,g:BufferGeometry=box)=>{
    place(g,pier[0]+f.tx*u+f.nx*v,h,pier[1]+f.tz*u+f.nz*v,f.yaw,scale,col,dry);
  };
  for(let i=0;i<21;i++)timber((i+.5)*6/21,0,.55,[.272,.16,2.4],i%3?"#b8a17c":"#c1ad88");
  for(const v of [-.92,.92])for(const u of [.32,2.95,5.69])timber(u,v,-.42,[.13,2,.13],"#716551",post);
  for(const u of [.4,3,5.6])timber(u,-.95,.82,[.12,.42,.12],"#4d5950",post);
  const meadow=land.cells.filter(p=>p.habitat==="LIGHT"&&p.d>1.2).sort((a,b)=>Math.hypot(a.x-shore[0],a.z-shore[1])-Math.hypot(b.x-shore[0],b.z-shore[1]))[0];
  if(meadow){const n=Math.ceil(Math.hypot(meadow.x-shore[0],meadow.z-shore[1])/.62);
    for(let i=1;i<=n;i++){const x=shore[0]+(meadow.x-shore[0])*i/n,z=shore[1]+(meadow.z-shore[1])*i/n;
      place(disk,x,surface(x,z)+.04,z,random()*3,[.33,.12,.22],"#aaa697",dry);}
  }
  const candidates=[...land.cells];
  for(let i=candidates.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[candidates[i],candidates[j]]=[candidates[j]!,candidates[i]!];}
  function scatter(cells:IslandCell[],count:number,spacing:number,fn:(p:IslandCell,i:number)=>void){
    const chosen:IslandCell[]=[];
    for(const p of cells){if(chosen.length>=count)break;
      if(chosen.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<spacing))continue;
      fn(p,chosen.length);chosen.push(p);
    }
  }
  for(const habitat of ["DEEP","LIGHT","REM","ASLEEP"] as const){
    const cells=candidates.filter(p=>p.habitat===habitat),area=cells.length*.25;
    if(habitat==="DEEP"){
      scatter(cells.filter(p=>p.d>1.5 && surface(p.x,p.z)>.54),Math.round(area/7),1.5,p=>{
        const conifer=random()<.65,name=conifer?"tree-conifer-"+["a","b","c"][Math.floor(random()*3)]:"tree-umbrella-"+(random()<.5?"a":"b");
        plant(name,p.x,p.z,(.62+random()*.50)*Math.min(1,land.radius/10));});
      scatter(cells,Math.round(area/40),2,p=>plant("rock-b",p.x,p.z,1+random()));
    }else if(habitat==="REM"){
      for(const [i,p] of land.pools.entries()){
        const basin=new CylinderGeometry(1,1,.028,14);
        const pos=basin.attributes.position;
        for(let k=0;k<pos.count;k++){
          const a=Math.atan2(pos.getZ(k),pos.getX(k)),r=1+.085*Math.sin(3*a+p.x)+.06*Math.cos(5*a+p.z);
          pos.setXYZ(k,pos.getX(k)*r,pos.getY(k),pos.getZ(k)*r);
        }
        place(basin,p.x,p.level+.012,p.z,p.yaw,[p.rx*.83,1,p.rz*.83],i%2?"#579693":"#68a6a0",dry);basin.dispose();
        plant(i%2?"coral-plate-a":"glow-anemone-a",p.x+p.rx*.57,p.z,.31,p.level+.02);
      }
      scatter(cells.filter(p=>p.d>.7 && land.pools.every(q=>Math.hypot(q.x-p.x,q.z-p.z)>q.rx+.3)),Math.round(area/6),1,p=>plant(random()<.5?"glow-plant-a":"glow-plant-b",p.x,p.z,.62+random()*.55));
      scatter(cells,Math.round(area/12),1,p=>plant("rubble-b",p.x,p.z,.48+random()*.45));
    }else if(habitat==="LIGHT"){
      scatter(cells.filter(p=>p.d<1.8),Math.round(Math.sqrt(area)*1.2),1.1,p=>plant("reed-clump-b",p.x,p.z,.54+random()*.45));
      scatter(cells.filter(p=>p.d>1),Math.round(area/13),1.3,(p,i)=>plant(i%2?"shrub-b":"tussock-a",p.x,p.z,.62+random()*.4));
    }else scatter(cells,Math.round(area/50),1,p=>plant("rock-c",p.x,p.z,.73));
  }
  for(let i=0;i<land.polygon.length;i+=3){
    const p=land.polygon[i]!,dx=p[0]-land.center[0],dz=p[1]-land.center[1],r=Math.hypot(dx,dz);
    const x=p[0]+dx/r*(1+random()*2.3),z=p[1]+dz/r*(1+random()*2.3);
    if(lagoonWeight(land,x,z)<.35||inside([x,z],land.polygon))continue;
    const y=WATER_LEVEL-ocean.bed.depthAt(x,z);if(y>-.38)continue;
    if(random()<.40)continue;
    for(let j=0;j<3;j++){
      const cx=x+(random()-.5)*2.6,cz=z+(random()-.5)*2.2,cy=WATER_LEVEL-ocean.bed.depthAt(cx,cz);
      if(cy<-.38 && cy>-2.8)plant(["coral-table-a","coral-tiered-b","sponge-tubes-b","coral-boulder-b"][Math.floor(random()*4)]!,cx,cz,Math.min(.7+random()*.3,(-cy-.16)/.8),cy,true);
    }
  }
  for(const [parts,name,glow,water] of [[dry,"Island vegetation and pier",false,false],[glowing,"Cove plants",true,false],[submerged,"Lagoon coral",false,true]] as const){
    if(parts.length)attach(mergeGeometries(parts),name,glow,water);for(const g of parts)g.dispose();
  }
  box.dispose();disk.dispose();post.dispose();if(!Array.isArray(ground.material))ground.material.dispose();root.userData.sleepCounts=planted;return root;
}
export function DestinationIsland({onIsland}:{onIsland:()=>void}){
  const ocean=useOcean(),assets=useLoader(GLTFLoader,"/models/sleep-world.glb");
  const root=useMemo(()=>islandModel(destination(),assets.scene,ocean),[assets,ocean]);
  useFrame(()=>{root.visible=ocean.uniforms.uIslandReveal.value>0;});
  useEffect(()=>()=>{root.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();o.material.dispose();o.customDepthMaterial?.dispose();}});},[root]);
  return <primitive object={root} name="Destination island" onClick={(e:ThreeEvent<MouseEvent>)=>{
    if(e.delta<5 && ocean.uniforms.uIslandReveal.value>=.99999){e.stopPropagation();onIsland();}
  }}/>;
}
