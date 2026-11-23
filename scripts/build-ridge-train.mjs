import { writeFile } from "node:fs/promises";
import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

const parts=[];
function part(g,color,x,y,z){
  g=g.index?g.toNonIndexed():g;
  g.translate(x,y,z);
  const colors=new Float32Array(g.attributes.position.count*3),rgb=new T.Color(color);
  for(let i=0;i<colors.length;i+=3)rgb.toArray(colors,i);
  g.setAttribute("color",new T.BufferAttribute(colors,3));
  g.deleteAttribute("uv");
  parts.push(g);
}
function box(w,h,d,x,y,z,c,r=.025){part(new RoundedBoxGeometry(w,h,d,2,r),c,x,y,z)}
const cream="#f4dfb7",red="#bb382c",blue="#264659",iron="#364147";
box(1.45,.71,5.45,0,.70,0,red,.14);
box(1.40,.76,5.31,0,1.39,0,cream,.14);
box(1.49,.19,5.44,0,1.78,0,cream,.09);
for(const side of [-1,1]){
  for(let i=0;i<6;i++)box(.055,.54,.72,side*.696,1.40,(i-2.5)*.85,blue,.05);
  box(.035,.035,5.08,side*.726,.97,0,cream);
  for(let i=0;i<5;i++)box(.025,.019,.48,side*.733,.59+i*.045,1.72,"#934038");
  box(.38,.14,.26,0,.33,side*2.77,iron);
  box(1.04,.48,.05,0,1.38,side*2.64,blue,.07);
  for(const x of [-.47,.47])box(.16,.13,.05,x,.78,side*2.72,cream);
  box(1.05,.24,.93,0,.25,side*1.66,iron);
  for(const dz of [-.32,.32])part(new T.CylinderGeometry(.23,.23,1.35,12).rotateZ(Math.PI/2),iron,0,.23,side*1.66+dz);
}
box(.84,.13,.87,0,1.92,.51,"#727b78");
box(.52,.12,.69,0,1.92,-1.12,iron);
for(const dir of [-1,1])for(const side of [-1,1]){
 const beam=new T.BoxGeometry(.035,.035,.69).rotateX(dir*side*.38);
 part(beam,iron,0,2.13+side*.11,-1.12+dir*.32);
}
const mesh=new T.Mesh(mergeGeometries(parts),new T.MeshStandardMaterial({vertexColors:true,roughness:.56}));
mesh.name="RidgeRailcar";
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.()})}};
await writeFile(new URL("../public/models/ridge-railcar.glb",import.meta.url),new Uint8Array(await new GLTFExporter().parseAsync(mesh,{binary:true})));
