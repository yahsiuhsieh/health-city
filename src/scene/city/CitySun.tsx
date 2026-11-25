import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { DirectionalLight, Object3D, OrthographicCamera, Vector3 } from "three";
import { cityLight } from "../lighting.ts";

export function CitySun({night,wide,focus}:{night:boolean;wide:boolean;focus:RefObject<Vector3>}) {
  const light=useRef<DirectionalLight>(null);
  const target=useMemo(()=>new Object3D(),[]);
  const mood=night?cityLight.night:cityLight.day;
  const vectors=useMemo(()=>({
    sun:new Vector3(...mood.direction).normalize(),ray:new Vector3(),point:new Vector3(),
    right:new Vector3(),up:new Vector3(),worldUp:new Vector3(0,1,0),
  }),[mood]);
  const resolution=wide?4096:2048;
  useEffect(()=>{
    const shadow=light.current?.shadow;
    if(shadow?.map && shadow.map.width!==resolution){shadow.map.dispose();shadow.map=null;}
  },[resolution]);
  useFrame(({camera})=>{
    if(!light.current || !(camera instanceof OrthographicCamera))return;
    const {sun,ray,point,right,up,worldUp}=vectors;
    target.position.copy(focus.current);
    light.current.position.copy(target.position).addScaledVector(sun,420);
    right.crossVectors(worldUp,sun).normalize();up.crossVectors(sun,right);
    camera.getWorldDirection(ray);
    let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
    for(const x of [-1,1])for(const y of [-1,1]){
      point.set(x,y,-1).unproject(camera);
      point.addScaledVector(ray,(1.6-point.y)/ray.y).sub(target.position);
      const u=point.dot(right),v=point.dot(up);
      xmin=Math.min(xmin,u);xmax=Math.max(xmax,u);ymin=Math.min(ymin,v);ymax=Math.max(ymax,v);
    }
    const c=light.current.shadow.camera;
    c.left=xmin-15;c.right=xmax+15;c.bottom=ymin-15;c.top=ymax+15;
    c.updateProjectionMatrix();
  });
  return <><primitive object={target}/><directionalLight ref={light} target={target} color={mood.sun} intensity={mood.intensity}
    castShadow shadow-mapSize={[resolution,resolution]} shadow-camera-near={1} shadow-camera-far={860}
    shadow-bias={-.00008} shadow-normalBias={.035}/></>;
}
