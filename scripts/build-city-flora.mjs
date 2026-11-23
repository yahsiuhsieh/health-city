import { writeFile } from "node:fs/promises";
import * as T from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

const root=new T.Group(), material=new T.MeshStandardMaterial({vertexColors:true,roughness:.91});
const canopy=["#6f8f55","#7f9c5e","#5e7f4c"];
for(const [index,name] of ["street-tree-a","street-tree-b","park-tree-a","park-tree-b","park-tree-c",
  "umbrella-pine-a","shrub-a","shrub-b","hedge-segment"].entries()){
  const pieces=[];
  function add(geometry,color){
    const g=geometry.index?geometry.toNonIndexed():geometry, rgb=new T.Color(color),values=[];
    g.deleteAttribute("uv");
    const p=g.attributes.position,n=g.attributes.normal;
    for(let i=0;i<p.count;i++){
      const shade=.76+.20*(.5+.5*n.getY(i))+.04*Math.min(1,Math.max(0,p.getY(i)));
      values.push(rgb.r*shade,rgb.g*shade,rgb.b*shade);
    }
    g.setAttribute("color",new T.Float32BufferAttribute(values,3));pieces.push(g);
  }
  const park=name.startsWith("park"),pine=name.startsWith("umbrella"), shrub=index>=6;
  const top=shrub?.68:pine?8.4:park?8.3+(index%3)*.73:6.3+index*.4;
  function branch(from,to,r,tip){
    const a=new T.Vector3(...from),b=new T.Vector3(...to),v=b.clone().sub(a);
    const g=new T.CylinderGeometry(tip,r,v.length(),8);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()));
    add(g.translate(...a.lerp(b,.5).toArray()),"#6a5440");
  }
  if(!shrub)branch([0,0,0],[0,top*.88,0],park?.31:.23,.105);
  const clusters=name==="hedge-segment"?4:shrub?3:5;
  for(let j=0;j<clusters;j++){
    const a=j*2.4+index*.86,r=j===0?0:shrub?.35:pine?2.05:park?1.53:1.05;
    const x=index===8?(j-1.5)*.52:r*Math.cos(a),z=r*Math.sin(a),y=top+(j===0?.12:-.12)*top*(pine?.34:1);
    if(!shrub&&j)branch([0,top*(pine?.55:.53),0],[x,y,z],.13,.06);
    const g=new T.IcosahedronGeometry(1,1),p=g.attributes.position;
    for(let k=0;k<p.count;k++){
      const u=p.getX(k),v=p.getY(k),w=p.getZ(k),noise=1+.08*Math.sin(8*u+5*v+4*w+j);
      p.setXYZ(k,u*noise,v*noise,w*noise);
    }
    g.computeVertexNormals();
    const span=shrub?.73:pine?2.45:park?2.3:1.88;
    add(g.scale(span,pine?.98:shrub?.5:park?2.15:1.65,span*.94).translate(x,y,z),canopy[(j+index)%3]);
  }
  const mesh=new T.Mesh(mergeVertices(mergeGeometries(pieces)),material);mesh.name=name;root.add(mesh);
}
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.()});}};
await writeFile(new URL("../public/models/city-flora.glb",import.meta.url),new Uint8Array(await new GLTFExporter().parseAsync(root,{binary:true})));
