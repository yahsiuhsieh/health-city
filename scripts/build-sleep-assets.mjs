import { seaLife } from "./sleep-sea-life.mjs";
import { writeFile } from "node:fs/promises";
import * as T from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const scene = new T.Group();
const matte = new T.MeshStandardMaterial({vertexColors:true,roughness:.91,side:T.DoubleSide});
const families = {
  "tree-conifer":3,"tree-umbrella":2,"reed-clump":3,seagrass:2,"coral-boulder":2,"coral-tiered":2,
  "coral-table":2,"coral-plate":2,"sponge-tubes":2,"coral-tube":1,anemone:2,"coral-branch":2,
  "glow-anemone":1,"glow-plant":2,rock:3,rubble:2,shrub:2,tussock:1,
};
function model(name,variant) {
  const parts=[];
  const tilt=variant*.71;
  function add(geometry,hex){
    const g=geometry.index?geometry.toNonIndexed():geometry;
    g.deleteAttribute("uv");
    const rgb=new T.Color(hex),colors=[], n=g.attributes.normal;
    for(let i=0;i<n.count;i++){
      const shade=.87+.13*n.getY(i);
      colors.push(rgb.r*shade,rgb.g*shade,rgb.b*shade);
    }
    g.setAttribute("color",new T.Float32BufferAttribute(colors,3));parts.push(g);
  }
  function profile(rings,sides,x,y,z,hex,wave=0){
    const points=[],indices=[];
    for(const [row,[r,h]] of rings.entries())for(let i=0;i<sides;i++){
      const a=2*Math.PI*i/sides+tilt;
      const radius=r*(1+wave*.22*Math.sin(3*a+.46*row));
      points.push(x+radius*Math.cos(a),y+h+wave*r*.21*Math.sin(4*a+.4*row),z+radius*Math.sin(a));
      if(row){const k=row*sides+i,next=row*sides+(i+1)%sides;
        indices.push(k-sides,k,next-sides,next-sides,k,next);}
    }
    const g=new T.BufferGeometry();
    g.setAttribute("position",new T.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();add(g,hex);
  }
  function lobe(x,y,z,rx,ry,rz,color,detail=0){
    add(new T.IcosahedronGeometry(1,detail).scale(rx,ry,rz).translate(x,y,z),color);
  }
  function limb(from,to,r,tip,color,sides=6){
    const a=new T.Vector3(...from),b=new T.Vector3(...to),dir=b.clone().sub(a);
    const g=new T.CylinderGeometry(tip,r,dir.length(),sides,1,true);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize()));
    add(g.translate(...a.lerp(b,.5).toArray()),color);
  }
  function foliage(count,grass,glow){
    for(let i=0;i<count;i++){
      const a=i*2.4+tilt,inner=i%3===0,h=grass?.5+.46*(.5+.5*Math.cos(i*1.7)):inner?.63:.42;
      const w=grass?.042:.14,r=grass?.16:inner?.11:.32,c=Math.cos(a),s=Math.sin(a);
      const vertices=[.09*c,0,.09*s,r*c+w*s,.48*h,r*s-w*c,r*c,.59*h,r*s,
        r*c-w*s,.48*h,r*s+w*c,(r+.14)*c,h,(r+.14)*s];
      const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
      g.setIndex([0,1,2,0,2,3,1,4,2,2,4,3]);g.computeVertexNormals();
      add(g,glow?(inner?"#7ff5e0":"#54968b"):grass?(inner?"#86984f":"#718b4e"):(inner?"#ea91ab":"#cd547e"));
    }
  }
  if(name==="tree-conifer"){
    limb([0,0,0],[.07,4.6,0],.18,.055,"#705844",7);
    for(let i=0;i<5;i++){
      const r=1.24-i*.182,y=.83+i*.71;
      profile([[0,.24],[r*.86,.02],[r,.16],[r*.79,.56],[.05,1.44]],9,.09*Math.sin(i+tilt),y,.09*Math.cos(i),["#3f6150","#476b53","#4a7059","#52785c","#61886a"][i],.66);
    }
  }else if(name==="tree-umbrella"){
    limb([0,0,0],[.17,2.6,0],.18,.13,"#715b47",7);
    for(let i=0;i<4;i++){
      const a=2.4*i+tilt,x=.95*Math.cos(a),z=.95*Math.sin(a),y=3.5+.65*(i%2);
      limb([.17,2.15,0],[x,y,z],.13,.065,"#705845",7);
      lobe(x,y,z,1.24,.69,1.16,i%2?"#7b9c70":"#5f8662",1);
    }
  }else if(name==="reed-clump" || name==="seagrass" || name==="tussock"){
    foliage(name==="reed-clump"?19:10,true,false);
    if(name==="reed-clump")for(let i=0;i<4;i++){
      const x=.14*Math.cos(i*2.4),z=.16*Math.sin(i*2.4),h=.9+.27*Math.sin(i+tilt);
      limb([x,0,z],[x+.07,h,z],.019,.013,"#949953",5);
      lobe(x+.07,h,z,.036,.13,.036,"#957548");
    }
  }else if(name==="coral-boulder"){
    const g=new T.SphereGeometry(1,12,8,0,Math.PI*2,0,Math.PI*.57),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=1+.08*Math.cos(17*x+2*Math.sin(7*z))*Math.cos(9*y+z);
      p.setXYZ(i,x*n*.52,(y+.22)*n*.56,z*n*.49);}
    g.computeVertexNormals();add(g,variant?"#d9a85a":"#e8c86a");
  }else if(name==="coral-tiered" || name==="coral-plate"){
    const plate=name==="coral-plate";
    for(let i=0;i<4;i++){
      const r=(plate?.67:.46)*(1-i*.15);
      profile([[.03,0],[r*.85,.08],[r,.14],[r*.76,.19],[.05,.24]],10,.07*Math.sin(i),i*(plate?.13:.16),.06*Math.cos(i),plate?(i%2?"#acddbd":"#81bba2"):(i%2?"#6cc5b5":"#4fa89e"),plate?.7:.23);
    }
  }else if(name==="coral-table"){
    profile([[.15,0],[.10,.34],[.48,.39],[.61,.47],[.54,.53],[.26,.6],[0,.61]],14,0,0,0,variant?"#ce8094":"#d996a6",.22);
    for(let i=0;i<8;i++)lobe(.37*Math.cos(i*2.4),.55,.37*Math.sin(i*2.4),.047,.022,.047,"#eab9b7");
  }else if(name==="sponge-tubes" || name==="coral-tube"){
    for(let i=0;i<4;i++){
      const a=i*2.4+tilt,r=i===0?0:.24,h=(name==="coral-tube"?.55:.74)*(.72+.29*Math.cos(i));
      profile([[.09,0],[.13,h*.7],[.15,h-.04],[.14,h],[.097,h+.014],[.078,h-.16],[0,h-.20]],6,r*Math.cos(a),0,r*Math.sin(a),name==="coral-tube"?"#ec985f":i%2?"#9073c6":"#775da9");
    }
  }else if(name==="coral-branch"){
    limb([0,0,0],[0,.52,0],.12,.084,"#dc917c");
    for(let i=0;i<4;i++){const a=i*2.4+tilt,x=.34*Math.cos(a),z=.34*Math.sin(a);
      limb([0,.16,0],[x,.44,z],.087,.068,"#dc917c");limb([x,.44,z],[x,.64,z],.069,.061,"#e9ae91");
      lobe(x,.64,z,.08,.093,.08,"#e9ae91");}
  }else if(name.includes("anemone") || name==="glow-plant"){
    foliage(16,false,name.startsWith("glow"));
  }else{
    const shrub=name==="shrub";lobe(0,shrub?.32:.19,0,.66,shrub?.57:.39,.53,shrub?"#76936c":variant%2?"#746e62":"#888478",1);
  }
  const mesh=new T.Mesh(mergeVertices(mergeGeometries(parts)),matte);
  mesh.name=name+"-"+String.fromCharCode(97+variant);return mesh;
}
for(const [name,count] of Object.entries(families))for(let i=0;i<count;i++)scene.add(model(name,i));
const buoy=new T.Group();buoy.name="wake-buoy";
function fitting(name,geometry,color,y){
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:.88}));
  mesh.name=name;mesh.position.y=y;buoy.add(mesh);
}
fitting("float",new T.LatheGeometry([[.32,-.33],[.46,-.26],[.5,-.13],[.5,.14],[.46,.28],[.35,.32],[0,.32]].map(([r,y])=>new T.Vector2(r,y)),16),"#efe2c4",.25);
for(const y of [.13,.43])fitting("terracotta-band",new T.CylinderGeometry(.503,.503,.065,16),"#c86a45",y);
fitting("waterline",new T.CylinderGeometry(.486,.475,.07,16),"#4d5a58",.04);
fitting("mast",new T.CylinderGeometry(.04,.079,.78,10),"#ae8c55",.96);
fitting("lantern-foot",new T.CylinderGeometry(.17,.12,.09,12),"#bc9758",1.37);
fitting("wake-buoy-lens",new T.CylinderGeometry(.105,.105,.18,12),"#ffc46b",1.5);
fitting("lantern-cap",new T.ConeGeometry(.17,.12,12),"#bc9758",1.64);
const sun=new T.Shape();sun.absarc(0,0,.175,0,Math.PI,false);sun.closePath();
fitting("wake-buoy-topmark",new T.ExtrudeGeometry(sun,{depth:.035,bevelEnabled:false}),"#efe2c4",1.72);
for(const a of [-.65,0,.65])fitting("sun-ray",new T.BoxGeometry(.032,.085,.03).rotateZ(a).translate(-.21*Math.sin(a),.21*Math.cos(a),0),"#efe2c4",1.72);
for(let i=0;i<3;i++)fitting("chain",new T.TorusGeometry(.055,.013,4,8).rotateY(i*Math.PI/2),"#4d5a58",-.10-i*.08);
const fittings=[];
for(const m of [...buoy.children]){
  if(m.name.startsWith("wake-buoy-"))continue;
  const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();m.updateMatrix();g.applyMatrix4(m.matrix);
  g.deleteAttribute("uv");const c=m.material.color,rgb=[];
  for(let i=0;i<g.attributes.position.count;i++)rgb.push(c.r,c.g,c.b);
  g.setAttribute("color",new T.Float32BufferAttribute(rgb,3));fittings.push(g);buoy.remove(m);
}
const float=new T.Mesh(mergeVertices(mergeGeometries(fittings)),matte);float.name="buoy-fittings";buoy.add(float);
scene.add(buoy);
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.()});}};
await writeFile(new URL("../public/models/sleep-world.glb",import.meta.url),new Uint8Array(await new GLTFExporter().parseAsync(scene,{binary:true})));

await writeFile(new URL("../public/models/sea-life.glb",import.meta.url),new Uint8Array(await new GLTFExporter().parseAsync(seaLife(),{binary:true})));
