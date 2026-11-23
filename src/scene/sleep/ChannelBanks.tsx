import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Mesh, MeshDepthMaterial, MeshStandardMaterial, RGBADepthPacking } from "three";
import { bankPoint,bankProfile,type Channel } from "./layout.ts";
import { patchReveal,type RevealUniforms } from "./reveal-material.ts";

export function channelBanks(channels:Channel[],universals:RevealUniforms){
  const positions:number[]=[],colors:number[]=[],keys:number[]=[],indices:number[]=[];
  const layers=["#454c47","#65665c","#746f63","#83806f","#8a9275","#677b55","#687951","#798668","#535b51"];
  for(const {sections} of channels){
    const start=keys.length;
    for(const [row,section] of sections.entries())for(const [col,[u,h]] of bankProfile.entries()){
      const p=bankPoint(section,u,h),tint=new Color(layers[col]);
      const crease=col>1 && col<5?.16*Math.sin(section.s*1.4+col):0;
      positions.push(p.x,p.y+crease,p.z);keys.push(section.s);
      tint.multiplyScalar(.96+.05*Math.sin(section.s*.63+col));
      colors.push(tint.r,tint.g,tint.b);
      if(!row||!col)continue;
      const i=start+row*bankProfile.length+col,j=i-bankProfile.length;
      if(section.side>0)indices.push(i,j,j-1,i,j-1,i-1);
      else indices.push(i,j-1,j,i,i-1,j-1);
    }
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute("position",new Float32BufferAttribute(positions,3));
  geometry.setAttribute("color",new Float32BufferAttribute(colors,3));
  geometry.setAttribute("routeS",new Float32BufferAttribute(keys,1));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new MeshStandardMaterial({vertexColors:true,roughness:.94,side:DoubleSide});
  const depth=new MeshDepthMaterial({depthPacking:RGBADepthPacking,side:DoubleSide});
  patchReveal(material,universals,true);patchReveal(depth,universals,true);
  const mesh=new Mesh(geometry,material);mesh.name="Channel banks";mesh.castShadow=mesh.receiveShadow=true;mesh.customDepthMaterial=depth;
  return mesh;
}
