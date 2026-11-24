import { BufferGeometry,Color,Float32BufferAttribute } from "three";
import { clamp01,noise,type IslandTerrain } from "./island-shape.ts";

export function islandMesh(land:IslandTerrain){
  const positions:number[]=[],colors:number[]=[],indices:number[]=[];
  const sand=new Color("#f6ecd2"),wet=new Color("#c9c19f"),soil=new Color("#777e4c"),color=new Color();
  const rings=Math.max(8,Math.ceil(land.radius/2)),n=land.polygon.length;
  function vertex(x:number,z:number,d:number){
    const width=land.beachWidth(x,z),y=land.elevation(x,z);
    color.copy(sand).lerp(wet,1-clamp01(d/1.7)).lerp(soil,clamp01((d-width)/3));
    color.multiplyScalar(.96+.08*noise(x*.45,z*.45));
    positions.push(x,y,z);colors.push(color.r,color.g,color.b);
  }
  vertex(...land.center,-land.distance(...land.center));
  for(let j=1;j<=rings;j++){
    for(let i=0;i<n;i++){
      const p=land.polygon[i]!,x=land.center[0]+(p[0]-land.center[0])*j/rings,z=land.center[1]+(p[1]-land.center[1])*j/rings;
      vertex(x,z,Math.max(0,-land.distance(x,z)));
      const a=1+(j-1)*n+i,b=1+(j-1)*n+(i+1)%n;
      if(j===1)indices.push(0,b,a);else indices.push(a-n,b,a,b-n,b,a-n);
    }
  }
  const g=new BufferGeometry();
  g.setAttribute("position",new Float32BufferAttribute(positions,3));
  g.setAttribute("color",new Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
