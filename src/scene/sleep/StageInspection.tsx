import {useMemo,useEffect} from "react";
import {BufferGeometry,DoubleSide,Float32BufferAttribute} from "three";
import {useOcean} from "../ocean/OceanEnvironment.tsx";
import {routeSpans} from "./timeline.ts";
import {SYNTHETIC_SESSION} from "./session.ts";
import {routeFrame,S_MOUTH} from "./route.ts";

export function StageInspection({inspect}:{inspect:(index:number)=>void}){
  const ocean=useOcean();
  const ribbon=useMemo(()=>{
    const positions:number[]=[],indices:number[]=[],faces:{index:number;s:number}[]=[];
    for(const span of routeSpans(SYNTHETIC_SESSION)){
      const start=Math.max(S_MOUTH,span.s0),length=span.s1-start;
      if(length<=0)continue;
      const n=Math.ceil(length/.6),base=positions.length/3;
      for(let i=0;i<=n;i++){
        const s=start+length*i/n,f=routeFrame(s);
        for(const side of [-8,8])positions.push(f.x+side*f.nx,.025,f.z+side*f.nz);
        if(i){const k=base+i*2;indices.push(k-2,k-1,k,k,k-1,k+1);faces.push({index:span.index,s},{index:span.index,s});}
      }
    }
    const g=new BufferGeometry();g.setAttribute("position",new Float32BufferAttribute(positions,3));g.setIndex(indices);return {g,faces};
  },[]);
  useEffect(()=>()=>ribbon.g.dispose(),[ribbon]);
  return <mesh geometry={ribbon.g} name="Inspect sleep stages" onClick={e=>{
    const face=ribbon.faces[e.faceIndex??-1];if(e.delta>=5 || !face || face.s>ocean.uniforms.uRevealS.value)return;
    e.stopPropagation();inspect(face.index);
  }}><meshBasicMaterial visible={false} side={DoubleSide}/></mesh>;
}
