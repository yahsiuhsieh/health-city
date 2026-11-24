import { useEffect, useMemo } from "react";
import { BufferGeometry, Color, Float32BufferAttribute, MeshStandardMaterial } from "three";
import { useOcean } from "./OceanEnvironment.tsx";
import { SEABED_LAYER, WATER_LEVEL } from "./layers.ts";
import { patchSand } from "./sand-material.ts";
import type { SeabedData } from "./seabed.ts";

export function seabedGeometry(bed: SeabedData) {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const vertices = new Map<number,number>();
  const sand = new Color("#e6d6a8"), silt = new Color("#6f8f86");
  const rock = new Color("#3f6b5a"), rockTop = new Color("#5a8a6e"), tint = new Color();
  const { x:left,y:bottom,z:width,w:height } = bed.bounds;
  function vertex(x: number,z: number) {
    const key = Math.round((z-bottom)*2)*(Math.ceil(width)*2+3)+Math.round((x-left)*2);
    const existing = vertices.get(key);
    if (existing !== undefined) return existing;
    const depth = bed.depthAt(x,z), mound = bed.sampleAt(x,z,4);
    // Keep the intertidal floor behind the water in the refraction depth pass.
    positions.push(x, WATER_LEVEL-(depth>=0 ? Math.max(.035,depth) : depth), z);
    tint.copy(sand).lerp(silt, Math.min(1,Math.max(0,(depth-3)/3)));
    if(bed.sampleAt(x,z,3)>1.5)tint.lerp(rock,.7);
    tint.lerp(rock,mound).lerp(rockTop,mound**4);
    if(bed.sampleAt(x,z,2)>0)tint.multiplyScalar(1-.46*mound);
    tint.multiplyScalar(1 + .05*Math.sin(z*2*Math.PI/.6 + 1.2*Math.sin(x*.74)));
    colors.push(tint.r,tint.g,tint.b);
    const i = vertices.size;
    vertices.set(key,i);
    return i;
  }
  const cols = Math.floor(width/2), rows = Math.floor(height/2);
  const cells = new Uint8Array(cols*rows);
  for (let j=0;j<rows;j++) for (let i=0;i<cols;i++) {
    const x = left+2*i+1, z = bottom+2*j+1;
    const depth = bed.depthAt(x,z);
    const shoreDistance=bed.sampleAt(x,z,1)*24;
    // Include the 0.6 m of run-up and the half-diagonal of a 2 m cell under the beach.
    const destination=bed.sampleAt(x,z,2)>.97;
    if (depth >= 12 || (!destination && depth>=0 && shoreDistance < -2.4)) continue;
    cells[j*cols+i] = destination && shoreDistance < -3 ? 1 : bed.sampleAt(x,z,2)>0 ? 3 : bed.sampleAt(x,z,5) <= 30 ? 2 : 1;
  }
  for (let j=0;j<rows;j++) for (let i=0;i<cols;i++) {
    const n = j*cols+i, cell = cells[n], x = left+2*i, z = bottom+2*j;
    if (!cell) continue;
    if (cell >= 2) {
      const step=cell===3?.5:1;
      for (let dz=0;dz<2;dz+=step) for (let dx=0;dx<2;dx+=step) {
        const a=vertex(x+dx,z+dz), b=vertex(x+dx+step,z+dz);
        const c=vertex(x+dx,z+dz+step), d=vertex(x+dx+step,z+dz+step);
        indices.push(a,c,b,b,c,d);
      }
    } else {
      const rim = [vertex(x,z)];
      if (cells[n-1]===2) rim.push(vertex(x,z+1));
      rim.push(vertex(x,z+2));
      if (cells[n+cols]===2) rim.push(vertex(x+1,z+2));
      rim.push(vertex(x+2,z+2));
      if (cells[n+1]===2) rim.push(vertex(x+2,z+1));
      rim.push(vertex(x+2,z));
      if (cells[n-cols]===2) rim.push(vertex(x+1,z));
      if (rim.length===4) indices.push(rim[0]!,rim[1]!,rim[2]!,rim[0]!,rim[2]!,rim[3]!);
      else {
        const center=vertex(x+1,z+1);
        rim.forEach((v,k)=>indices.push(center,v,rim[(k+1)%rim.length]!));
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position",new Float32BufferAttribute(positions,3));
  g.setAttribute("color",new Float32BufferAttribute(colors,3));
  g.setIndex(indices);
  g.computeVertexNormals();
  g.computeBoundingBox();
  return g;
}

export function Seabed() {
  const ocean = useOcean();
  const surfaces=useMemo(()=>{
    const bed=seabedGeometry(ocean.bed),material=new MeshStandardMaterial({vertexColors:true,roughness:.95});
    material.onBeforeCompile=shader=>patchSand(shader,ocean,"seabed");
    const below:number[]=[],exposed:number[]=[],pos=bed.getAttribute("position"),index=bed.index!;
    for(let i=0;i<index.count;i+=3){
      const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
      const list=Math.max(pos.getY(a),pos.getY(b),pos.getY(c))>WATER_LEVEL?exposed:below;
      list.push(a,b,c);
    }
    const bars=new BufferGeometry();
    for(const [name,attribute] of Object.entries(bed.attributes))bars.setAttribute(name,attribute);
    bed.setIndex(below);bars.setIndex(exposed);
    return {bed,bars,material};
  },[ocean]);
  useEffect(()=>()=>{surfaces.bed.dispose();surfaces.bars.dispose();surfaces.material.dispose();},[surfaces]);
  return <><mesh name="Seabed" layers-mask={1<<SEABED_LAYER} geometry={surfaces.bed} material={surfaces.material} receiveShadow/>
    {!!surfaces.bars.index!.count && <mesh name="Exposed sandbars" geometry={surfaces.bars} material={surfaces.material} receiveShadow/>}</>;
}
