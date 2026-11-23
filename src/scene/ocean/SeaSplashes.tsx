import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color, ConeGeometry, DoubleSide, Group, InstancedMesh, Matrix4, MeshStandardMaterial,
  Object3D, PlaneGeometry, ShaderMaterial, SphereGeometry, Vector3,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { freighter } from "../port-layout.ts";
import { berths } from "../HarborFleet.tsx";
import { useOcean } from "./OceanEnvironment.tsx";
import { TRANSPARENT_LAYER, WATER_LEVEL } from "./layers.ts";
import { boatPathSamples } from "./wake.ts";
import { CELL_SIZE, EVENT_POOL, scheduledSplashes, splashAge, visibleSchedule } from "./splash-schedule.ts";
import type { SplashEvent } from "./splash-schedule.ts";

function decalMaterial(ring:boolean) {
  return new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,forceSinglePass:true,
    uniforms:{tint:{value:new Color()}},
    vertexShader:`
      varying vec2 point;
      varying float alpha;
      void main(){
        point=uv*2.-1.;
        alpha=instanceColor.r;
        gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);
      }`,
    fragmentShader:`
      varying vec2 point;
      varying float alpha;
      uniform vec3 tint;
      void main(){
        float radius=length(point);
        float shape=${ring?"1.-smoothstep(.012,max(.07,fwidth(radius)*1.5),abs(radius-.91))":"1.-smoothstep(.44,1.,radius)"};
        gl_FragColor=vec4(tint,alpha*shape);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
}

function splashPool() {
  // Replace this temporary silhouette when the sleep voyage supplies sea-life.glb.
  const body=new SphereGeometry(1,12,8).scale(.28,.115,.10);
  const tail=new ConeGeometry(.15,.23,3).rotateZ(-Math.PI/2).scale(1,1,.4).translate(-.29,0,0);
  const fish=new InstancedMesh(mergeGeometries([body,tail])!,new MeshStandardMaterial({color:"#80aeb0",roughness:.55}),EVENT_POOL);
  body.dispose();tail.dispose();
  const drops=new InstancedMesh(new PlaneGeometry(1,1),decalMaterial(false),EVENT_POOL*12);
  const rings=new InstancedMesh(new PlaneGeometry(2,2).rotateX(-Math.PI/2),decalMaterial(true),EVENT_POOL*2);
  const group=new Group();
  fish.name="Jumping fish";drops.name="Splash droplets";rings.name="Splash rings";
  for(const mesh of [fish,drops,rings]){
    mesh.count=0;mesh.frustumCulled=false;group.add(mesh);
  }
  const color=new Color(1,1,1);
  for(const mesh of [drops,rings]){mesh.layers.set(TRANSPARENT_LAYER);mesh.setColorAt(0,color);}
  return {group,fish,drops,rings,dummy:new Object3D(),color};
}

export function SeaSplashes({hasVoyage,preview,night}:{hasVoyage:boolean;preview:boolean;night:boolean}) {
  const ocean=useOcean();
  const pool=useMemo(splashPool,[]);
  const region=useMemo(()=>{
    const paths=boatPathSamples(hasVoyage,preview);
    for(const berth of berths) paths.push(berth);
    for(let dz=-freighter.length/2;dz<=freighter.length/2;dz++) paths.push({x:freighter.x,z:freighter.z+dz});
    const cells=new Map<string,SplashEvent[]>();
    return {paths,cells,lastTime:NaN,lastNight:night,events:[] as SplashEvent[],projection:new Matrix4(),previous:new Matrix4(),point:new Vector3(),direction:new Vector3()};
  },[hasVoyage,preview,ocean]);
  useEffect(()=>()=>{for(const m of [pool.fish,pool.rings,pool.drops]){m.geometry.dispose();m.material.dispose();m.dispose();}},[pool]);
  useFrame(({camera})=>{
    const {point,direction}=region;
    region.projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    const moved=!region.previous.equals(region.projection);
    const time=ocean.uniforms.oceanTime.value;
    if(!moved && time===region.lastTime && night===region.lastNight) return;
    region.lastTime=time;region.lastNight=night;
    if(moved){
      region.previous.copy(region.projection);
      camera.getWorldDirection(direction);
      let left=Infinity,right=-Infinity,near=Infinity,far=-Infinity;
      for(const x of [-1,1]) for(const y of [-1,1]){
        point.set(x,y,0).unproject(camera);
        point.addScaledVector(direction,(WATER_LEVEL-point.y)/direction.y);
        left=Math.min(left,point.x);right=Math.max(right,point.x);
        near=Math.min(near,point.z);far=Math.max(far,point.z);
      }
      const candidates:SplashEvent[]=[], seen=new Set<string>();
      for(let x=Math.floor(Math.max(-500,left)/CELL_SIZE)-1;x<=Math.floor(Math.min(500,right)/CELL_SIZE)+1;x++){
        for(let z=Math.floor(Math.max(-500,near)/CELL_SIZE)-1;z<=Math.floor(Math.min(500,far)/CELL_SIZE)+1;z++){
          const key=x+","+z;seen.add(key);
          let events=region.cells.get(key);
          if(!events){
            const depthAt=(px:number,pz:number)=>ocean.bed.sampleAt(px,pz,1)<0?0:ocean.bed.depthAt(px,pz);
            events=scheduledSplashes({x,z},depthAt,region.paths);region.cells.set(key,events);
          }
          for(const e of events){
            if(Math.abs(e.x)>500 || Math.abs(e.z)>500)continue;
            point.set(e.x,WATER_LEVEL,e.z).applyMatrix4(region.projection);
            if(Math.abs(point.x)<1.03 && Math.abs(point.y)<1.03)candidates.push(e);
          }
        }
      }
      for(const key of region.cells.keys())if(!seen.has(key))region.cells.delete(key);
      region.events=visibleSchedule(candidates);
    }
    const {fish,drops,rings,dummy,color}=pool;
    fish.count=drops.count=rings.count=0;
    drops.material.uniforms.tint!.value.set(night?"#a1bbc4":"#effbfa");
    rings.material.uniforms.tint!.value.copy(drops.material.uniforms.tint!.value);
    for(const e of region.events){
      const age=splashAge(time,e);
      if(age>3.5)continue;
      const u=Math.min(age/.8,1), dx=Math.cos(e.angle), dz=Math.sin(e.angle);
      if(age<.8){
        dummy.position.set(e.x+u*e.length*dx,WATER_LEVEL+4*e.height*u*(1-u),e.z+u*e.length*dz);
        dummy.rotation.set(0,-e.angle,Math.atan2(4*e.height*(1-2*u),e.length),"YXZ");
        dummy.scale.setScalar(1);dummy.updateMatrix();fish.setMatrixAt(fish.count++,dummy.matrix);
      }
      const entry=age>=.8;
      const x=e.x+(entry?e.length*dx:0),z=e.z+(entry?e.length*dz:0);
      const flight=(age-(entry?.8:0))/.52;
      if(flight<1){
        for(let j=0;j<e.drops;j++){
          const angle=j*2.39996+e.seed*9, h=.4+.1*Math.sin(j*3.1+e.seed);
          const spread=flight*(.36+.18*Math.cos(j+e.seed));
          dummy.position.set(x+spread*Math.cos(angle),WATER_LEVEL+.045+4*h*flight*(1-flight),z+spread*Math.sin(angle));
          dummy.quaternion.copy(camera.quaternion);dummy.scale.set(.082,.115,1);dummy.updateMatrix();
          drops.setMatrixAt(drops.count,dummy.matrix);drops.setColorAt(drops.count++,color.setScalar(.88*(1-flight)));
        }
      }
      if(entry) for(const delay of [0,.27]){
        const t=(age-.8-delay)/(2.7-delay);
        if(t<0) continue;
        dummy.rotation.set(0,0,0);dummy.position.set(x,WATER_LEVEL+.018,z);
        dummy.scale.setScalar(.2+1.4*t);dummy.updateMatrix();
        rings.setMatrixAt(rings.count,dummy.matrix);rings.setColorAt(rings.count++,color.setScalar(.35*(1-t)));
      }
    }
    for(const mesh of [fish,drops,rings]){
      mesh.visible=mesh.count>0;
      if(mesh.visible){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
    }
  });
  return <primitive object={pool.group} dispose={null}/>;
}
