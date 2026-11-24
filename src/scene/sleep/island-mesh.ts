import { BufferGeometry,Color,Float32BufferAttribute,ShapeUtils,Vector2 } from "three";
import type { Point } from "../loop-path.ts";
import { coastDistance,inside,type IslandTerrain } from "./island-shape.ts";
const colors={LIGHT:new Color("#a8b071"),DEEP:new Color("#607751"),REM:new Color("#d6b6a8"),ASLEEP:new Color("#b3b48c")};
const sand=new Color("#d9c79c"),wet=new Color("#bca77c");
function clip(poly:readonly Point[],axis:0|1,value:number,sign:number){
  const out:Point[]=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[(i+poly.length-1)%poly.length]!,b=poly[i]!,da=sign*(a[axis]-value),db=sign*(b[axis]-value);
    if((da>=0)!==(db>=0)){
      const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
    }
    if(db>=0)out.push(b);
  }
  return out;
}
export function islandMesh(land:IslandTerrain){
  const positions:number[]=[],rgb:number[]=[],indices:number[]=[],lookup=new Map<string,number>();
  function vertex(x:number,z:number){
    const k=x.toFixed(5)+"/"+z.toFixed(5),existing=lookup.get(k);
    if(existing!==undefined)return existing;
    let d=coastDistance(x,z,land.polygon);
    if(d>.55 && Number.isInteger(x)&&Number.isInteger(z)){
      x+=.19*Math.sin(53*x+17*z);z+=.19*Math.cos(31*x-61*z);d=coastDistance(x,z,land.polygon);
    }
    const y=land.elevation(x,z,d),color=new Color(0,0,0);let weight=0;
    for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){
      const q=land.cellAt(x+i*.5,z+j*.5);if(!q)continue;
      const w=Math.max(0,1-Math.hypot(q.x-x,q.z-z)/1.5);
      const col=colors[q.habitat];color.r+=w*col.r;color.g+=w*col.g;color.b+=w*col.b;weight+=w;
    }
    if(weight)color.multiplyScalar(1/weight);else color.copy(sand);
    color.lerp(sand,Math.max(0,1-d/2.3)).lerp(wet,Math.max(0,1-d/.65));
    color.multiplyScalar(.98+.032*Math.sin(.58*x+z*.79));
    const id=positions.length/3;positions.push(x,y,z);rgb.push(color.r,color.g,color.b);lookup.set(k,id);return id;
  }
  for(let x=land.left;x<land.left+land.width;x++){
    const strip=clip(clip(land.polygon,0,x,1),0,x+1,-1);if(strip.length<3)continue;
    for(let z=land.bottom;z<land.bottom+land.height;z++){
      const tile=clip(clip(strip,1,z,1),1,z+1,-1);if(tile.length<3)continue;
      const ids=tile.map(([px,pz])=>vertex(px,pz));
      for(const [a,b,c] of ShapeUtils.triangulateShape(tile.map(p=>new Vector2(...p)),[]))indices.push(ids[a!]!,ids[c!]!,ids[b!]!);
    }
  }
  const g=new BufferGeometry();g.setAttribute("position",new Float32BufferAttribute(positions,3));g.setAttribute("color",new Float32BufferAttribute(rgb,3));g.setIndex(indices);g.computeVertexNormals();
  const tris=g.toNonIndexed(),smooth=tris.attributes.normal!.clone();tris.computeVertexNormals();
  const normals=tris.attributes.normal!;
  for(let i=0;i<normals.count;i++)normals.setXYZ(i,.65*smooth.getX(i)+.35*normals.getX(i),.65*smooth.getY(i)+.35*normals.getY(i),.65*smooth.getZ(i)+.35*normals.getZ(i));
  tris.normalizeNormals();g.dispose();return tris;
}
export function lagoonWeight(land:IslandTerrain,x:number,z:number){
  const dx=x-land.center[0],dz=z-land.center[1],a=Math.atan2(dz,dx)-land.cove;
  if(Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))>.85 || inside([x,z],land.polygon))return 0;
  return Math.max(0,1-coastDistance(x,z,land.polygon)/8);
}
