// Representative facade bays face positive Z. The module origin is at the floor.
import {smoothWalk,parkPaving,ribbon,walkGrade,plotGroundGrade} from "../src/scene/city/walkway-shape.ts";
import {palette} from "../src/scene/city/palette.ts";
import {footwayClipper} from "../src/scene/city/pavement.ts";
import {gardens,courts} from "../src/scene/city/open-space-designs.ts";
import { writeFile } from "node:fs/promises";
import * as T from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const root=new T.Group();
const surface=new T.MeshStandardMaterial({vertexColors:true,roughness:.79});
let pieces=[];
function piece(g,at,color,bakeShade=true) {
  g.translate(...at);
  const c=new T.Color(color), colors=[],p=g.getAttribute("position"),norm=g.getAttribute("normal");
  for(let i=0;i<p.count;i++){
    const ao=(.82+.18*Math.min(1,Math.max(0,p.getY(i))/.6))*(norm.getY(i)<-.45?.72:1);
    const shade=bakeShade?ao:1;
    colors.push(c.r*shade,c.g*shade,c.b*shade);
  }
  g.setAttribute("color",new T.Float32BufferAttribute(colors,3));
  g.deleteAttribute("uv");pieces.push(g.index?g.toNonIndexed():g);
}
const box=(w,h,d,x,y,z,c)=>piece(new T.BoxGeometry(w,h,d),[x,y,z],c);
function finish(name){
  const geom=mergeGeometries(pieces),mesh=new T.Mesh(geom,surface);
  if(geom.getAttribute("position").count/3>600)throw Error("City module exceeds 600 triangles: "+name);
  mesh.name=name;root.add(mesh);pieces=[];
}
const stone="#e5dace", frame="#3e504e", glass="#607f82", trim="#dfc9a8", timber="#78573f";
for(let variant=0;variant<3;variant++){
  const retail=variant===0,h=retail?4.2:3.2;
  box(3.2,h,.22,0,h/2,-.23,stone);
  const w=retail?2.82:variant===1?2.27:2.62, sill=retail?.33:.73,head=h-.40;
  box(w,head-sill,.08,0,(sill+head)/2,-.07,frame);
  for(const side of [-1,1]){
    box(w/2-.12,head-sill-.16,.06,side*w/4,(head+sill)/2,.005,glass);
    box(.13,head-sill+.22,.37,side*(w/2+.05),(sill+head)/2,.05,trim);
  }
  box(w+.25,.14,.41,0,sill-.04,.09,stone);
  box(w+.27,.18,.41,0,head+.035,.09,stone);
  box(w,.075,.09,0,head-(retail?.64:.5),.06,frame);
  if(retail){
    box(2.95,.40,.25,0,3.82,.17,timber);
    box(3.02,.12,1.30,0,3.22,.67,"#587e72");box(3.02,.19,.08,0,3.12,1.27,"#48685e");
  }else if(variant===2){
    box(2.9,.15,.85,0,.56,.44,trim);
    box(2.87,.07,.07,0,1.45,.83,frame);
    for(let k=-4;k<=4;k++)box(.038,.87,.04,k*.32,1,.83,frame);
  }
  finish(["gf-shopfront","upper-window","upper-balcony"][variant]);
}
box(3.2,4.2,.22,0,2.1,-.22,stone);
box(1.95,3.45,.28,0,1.73,-.05,timber);box(1.59,3.12,.12,0,1.59,.12,frame);
box(.66,2.84,.06,-.38,1.59,.21,glass);box(.66,2.84,.06,.38,1.59,.21,glass);
box(2.55,.16,1.05,0,3.57,.57,trim);finish("gf-entrance");
// A full-height pier joins floors into the vertical bands of the Deco family.
box(2.3,3.8,.33,0,1.9,-.13,"#ccb996");
box(1.83,2.94,.10,0,1.89,.06,"#465859");
for(const x of [-.46,.46])box(.82,2.4,.055,x,1.94,.14,"#587277");
for(const x of [-1.02,1.02]){
  box(.20,3.8,.62,x,1.9,.16,"#e8d4ad");
  box(.055,3.8,.05,x,1.9,.5,"#a28350");
}
box(1.8,.40,.13,0,.27,.13,"#8b775b");finish("deco-floor-bay");
box(1,1,1,0,.5,0,"#ffffff");finish("wall");
box(.97,.93,.02,0,0,0,"#ffffff");finish("lit-glazing");
box(2.5,1.19,1.45,0,.6,0,"#98988b");
for(let i=0;i<6;i++)box(.22,.57,.025,-.92+i*.36,.66,.74,frame);
piece(new T.CylinderGeometry(.51,.51,.07,12),[.46,1.22,0],"#687470");finish("roof-vent");
box(2.75,.2,.95,0,.58,0,timber);box(2.75,.32,.12,0,.9,-.4,timber);
for(const x of [-1,1])box(.17,.54,.79,x,.27,0,frame);
finish("bench");
piece(new T.CylinderGeometry(.15,.26,3.7,9),[0,1.85,0],"#68503d");
for(const [x,y,z,sx,sy,sz,c] of [[0,6.55,0,2.33,2.1,2.19,"#819b61"],[-1.27,5,.1,1.84,1.67,1.78,"#668851"],[1.45,5.22,-.25,1.7,1.66,1.95,"#77955a"],[.2,4.9,1.3,1.6,1.36,1.42,"#789256"]]){
  const g=new T.IcosahedronGeometry(1,1),points=g.attributes.position;
  for(let i=0;i<points.count;i++){
    const a=points.getX(i),b=points.getY(i),d=points.getZ(i);
    const rough=1+.12*Math.sin(a*7+b*3+d*9+x);
    points.setXYZ(i,a*sx*rough,b*sy*(b>0?.71:1)*rough,d*sz*rough);
  }
  g.computeVertexNormals();piece(g,[x,y,z],c);
}
finish("street-tree");
// Older street-front modules use the same floor origin and recessed glazing as the city bays.
const woodwork=["#5f6f62","#7a4f3c","#3f5a6a"], tile=["#8c5a48","#6f6a66"];
function dressedStone(w,h,d,x,y,z,color){
  const bevel=.028,halfW=w/2-bevel,halfH=h/2-bevel;
  const outline=new T.Shape();
  outline.moveTo(-halfW,-halfH);outline.lineTo(halfW,-halfH);
  outline.lineTo(halfW,halfH);outline.lineTo(-halfW,halfH);outline.closePath();
  const g=new T.ExtrudeGeometry(outline,{depth:d-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1});
  piece(g,[x,y,z-d/2+bevel],color);
}
function profile(points,depth,color,angle=0){
  const shape=new T.Shape(points.map(([x,y])=>new T.Vector2(x,y)));
  const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false});
  g.translate(0,0,-depth/2);g.rotateY(angle);piece(g,[0,0,0],color);
}
for(let i=0;i<3;i++){
  const c=woodwork[i],cloth=["#a76248","#7f927d","#d3b582"][i];
  box(3.15,3.28,.18,0,1.64,-.11,c);
  box(1.88,1.98,.09,-.48,1.67,.025,glass);box(.76,2.62,.09,1.00,1.4,.025,glass);
  for(const x of [-1.5,.55,1.5])box(.10,3.03,.30,x,1.52,.15,c);
  box(3.12,.41,.31,0,3.06,.15,c);box(1.98,.13,.35,-.48,.69,.15,trim);
  for(let j=0;j<3;j++)box(.27,.18+.14*((i+j)%3),.13,-1.12+j*.56,.86,.14,["#c18e48","#c96b53","#829369"][(i+j)%3]);
  const awning=new T.BoxGeometry(3.06,.10,1.08);awning.rotateX(.14);piece(awning,[0,2.79,.58],cloth);
  box(3.06,.14,.07,0,2.65,1.10,cloth);finish("gf-timber-shopfront-"+i);
  const w=1.18+i*.16;
  box(w+.20,1.95,.18,0,1.55,-.04,trim);box(w,1.79,.08,0,1.55,.065,glass);
  for(const x of [-w/2,0,w/2])box(.065,1.83,.13,x,1.55,.14,c);
  box(w,.075,.14,0,1.65,.15,c);dressedStone(w+.39,.15,.42,0,.58,.14,stone);
  box(w+.30,.14,.32,0,2.55,.11,trim);finish("upper-sash-window-"+i);
  box(2.32,.13,1.13,0,.95,0,timber);
  for(const x of [-1.03,1.03])for(const z of [-.45,.45])box(.08,2.48,.08,x,1.24,z,c);
  for(let j=0;j<5;j++)box(.47,.10,1.49,(j-2)*.47,2.48,0,j%2?cloth:"#e4d6b8");
  for(let j=0;j<3;j++)box(.56,.30,.69,(j-1)*.71,1.15,0,["#aa5d44","#cead59","#7d9363"][(i+j)%3]);
  finish("market-stall-"+i);
}
for(let i=0;i<2;i++){
  const rise=1.18+i*.32;
  profile([[-5,0],[5,0],[0,rise]],6,tile[i],Math.PI/2);
  box(6,.13,.16,0,rise,0,tile[i]);finish("pitched-roof-terrace-"+i);
  box(.63,1.03,.7,0,.515,0,"#9a5e4a");dressedStone(.77,.16,.83,0,1.06,0,trim);
  for(const x of (i?[-.18,.18]:[0]))piece(new T.CylinderGeometry(.12,.16,.32,8),[x,1.30,0],"#9b684f");
  finish("chimney-"+i);
  box(2.72,1.95,2,0,.975,0,i?"#a69980":"#ac977b");box(.90,1.68,.08,.56,.84,1.03,woodwork[i]);
  profile([[-1.48,1.95],[1.48,1.95],[0,2.60]],2.24,tile[i]);finish("yard-shed-"+i);
  const w=7.75,base=5.55,roof=i?Array.from({length:9},(_,j)=>{const a=j*Math.PI/8;return [-w*Math.cos(a),base+2.57*Math.sin(a)];}):[[-w,base],[0,8.18],[w,base]];
  profile([...roof,...roof.slice().reverse().map(([x,y])=>[x,y-.21])],10.9,"#7c8a86");
  for(const z of [-5.15,5.15])for(let j=1;j<roof.length;j++){
    const [a,b]=[roof[j-1],roof[j]],dx=b[0]-a[0],dy=b[1]-a[1];
    const seam=new T.BoxGeometry(Math.hypot(dx,dy),.07,.08);seam.rotateZ(Math.atan2(dy,dx));piece(seam,[(a[0]+b[0])/2,(a[1]+b[1])/2+.035,z],"#637671");
  }
  box(15.35,5.41,.34,0,2.705,-5.15,"#ad8064");
  for(const side of [-1,1]){
    box(.34,3.95,10.3,side*7.54,1.975,0,"#b59674");
    box(.19,1.12,10.3,side*7.54,4.64,0,glass);
    for(let j=-2;j<=2;j++)box(.42,5.58,.23,side*7.54,2.79,j*2.45,trim);
  }
  for(const x of [-7.5,-3.75,0,3.75,7.5])box(.37,5.55,.48,x,2.775,5.14,trim);
  box(15.38,.36,.5,0,5.32,5.14,"#805b49");finish("market-hall-"+i);
}
box(4.04,4.07,.33,0,2.035,0,"#c9bba2");
box(1.70,3.05,.1,0,1.54,.20,"#574e44");
for(const x of [-1.36,1.36]){
  box(.48,.3,.66,x,.15,.42,stone);
  piece(new T.CylinderGeometry(.20,.24,3.17,8),[x,1.88,.42],stone);
  box(.56,.23,.65,x,3.55,.42,trim);
}
dressedStone(3.65,.35,.77,0,3.84,.36,stone);profile([[-1.95,4.01],[1.95,4.01],[0,4.66]],.79,stone);
finish("bank-front");
piece(new T.CylinderGeometry(1.67,1.84,.43,20),[0,.215,0],"#b4aea1");
piece(new T.CylinderGeometry(1.49,1.49,.024,20),[0,.435,0],"#769a98");
piece(new T.CylinderGeometry(.22,.36,.72,12),[0,.78,0],stone);
piece(new T.CylinderGeometry(.63,.22,.18,14),[0,1.19,0],stone);finish("fountain-basin");
piece(new T.CylinderGeometry(.55,.55,.09,12),[0,.82,0],timber);
piece(new T.CylinderGeometry(.10,.18,.78,8),[0,.39,0],frame);
for(const x of [-.83,.83]){
  box(.45,.11,.43,x,.46,0,woodwork[0]);box(.07,.45,.44,x+Math.sign(x)*.20,.69,0,woodwork[0]);
  for(const z of [-.16,.16])box(.23,.43,.05,x,.22,z,frame);
}
finish("cafe-table");
// The standalone block includes its path. The full city builds each entrance through to its junction.
function floorPatch(points,h,color,bakeShade=true){
  const faces=T.ShapeUtils.triangulateShape(points.map(([x,z])=>new T.Vector2(x,z)),[]);
  const xyz=faces.flatMap(face=>face.reverse().flatMap(i=>[points[i][0],h,points[i][1]]));
  const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(xyz,3));
  g.computeVertexNormals();piece(g,[0,0,0],color,bakeShade);
}
for(const [kind,designs] of [["park",gardens],["plaza",courts]]){
  for(const [i,design] of designs.entries()){
    const ring=design.curved?smoothWalk(design.outline,true):design.outline;
    const top=walkGrade-plotGroundGrade;
    const path=design.path.length>2?smoothWalk(design.path):design.path;
    const cut=footwayClipper(kind==="plaza"?[{polygon:ring}]:[]);
    const bench=design.benches.find((_,j)=>j!==design.endBench);
    for(const quad of kind==="park"?parkPaving(path,undefined,bench):ribbon(path,1.18)){
      for(const patch of cut(quad))floorPatch(patch,top,palette.sidewalk,false);
    }
    finish(kind+"-trail-"+i);
    if(kind==="park")floorPatch(ring,.011,["#8ea86d","#91ac73","#91a96f"][i]);
    else{
      const scaled=(point,r)=>point.map(v=>v*r);
      // Neighboring stone courses share edges at one elevation.
      floorPatch(ring.map(p=>scaled(p,.40)),top,"#c7c1b4",false);
      for(const [lo,hi,color] of [[.4,.418,"#b9b3a7"],[.418,.71,"#c7c1b4"],[.71,.728,"#b9b3a7"],
        [.728,.94,"#c7c1b4"],[.94,.963,"#b9b3a7"],[.963,1,palette.sidewalk]]){
        for(let j=0;j<ring.length;j++){
          const a=ring[j],b=ring[(j+1)%ring.length];
          floorPatch([scaled(a,lo),scaled(b,lo),scaled(b,hi),scaled(a,hi)],top,color,false);
        }
      }
    }
    finish(kind+"-ground-"+i);
  }
}
piece(new T.CylinderGeometry(1.18,1.07,.43,14),[0,.215,0],"#aaa799");
piece(new T.CylinderGeometry(1.01,1.01,.04,14),[0,.43,0],"#687557");
finish("round-planter");
// Keep the bay opening and glass dimensions consistent with the night inserts.
for(const [base,count] of [["gf-shopfront",4],["gf-entrance",2],["upper-window",5],["upper-balcony",2]]){
  for(let i=0;i<count;i++){
    pieces.push(root.getObjectByName(base).geometry.clone());
    if(base==="gf-shopfront"){
      const shade=["#527769","#97705a","#65768a","#aa915c"][i];
      box(3.04,.12,1.33,0,3.3,.67,shade);box(3.04,.23,.1,0,3.15,1.31,shade);
      if(i%2)for(let j=0;j<5;j++)box(.16,.02,1.29,(j-2)*.61,3.37,.67,"#dacdb6");
    }else if(base==="gf-entrance"){
      for(const x of [-1.08,1.08])box(.17,3.45,.26,x,1.73,.21,i?timber:trim);
    }else {
      box(2.94,.12+i*.035,.34,0,.64,.16,i%2?stone:trim);
      if(i%2)for(const x of [-1.37,1.37])box(.24,2.08,.13,x,1.8,.18,timber);
      if(i>1)box(2.62,.13,.38,0,2.98,.2,stone);
    }
    finish(base+"-"+i);
  }
}
for(let i=0;i<3;i++){
  for(let j=0;j<=i;j++)box(1,.12,.32+j*.12,0,.1+j*.115,.05+j*.04,trim);
  finish("cornice-"+i);
  box(1,.32+i*.12,.29,0,.16+i*.06,0,stone);box(1,.09,.41,0,.36+i*.12,0,trim);
  finish("parapet-"+i);
}
for(let i=0;i<2;i++){
  box(1,.15,.31,0,.075,0,trim);if(i)box(1,.06,.39,0,.19,0,stone);finish("string-course-"+i);
  box(3.2,4.2,.24,0,2.1,-.18,stone);
  for(let j=0;j<13;j++)box(2.65,.22,.12,0,.24+j*.25,.02,i?"#687676":"#837d71");
  finish("gf-solid-"+i);
  box(.48,3.2,.48,0,1.6,0,trim);box(.58,.16,.58,0,3.12,0,stone);
  if(i)piece(new T.CylinderGeometry(.39,.39,3.05,10),[0,1.53,0],stone);
  finish("corner-bay-"+i);
  for(const side of [-1,1])piece(new T.BoxGeometry(3.22,.13,2.32).rotateX(side*.32),[0,.38,side*1.08],i?"#897c6d":"#925f4b");
  finish("pitched-roof-"+i);
}
for(let i=0;i<6;i++){
  if(i===0)pieces.push(root.getObjectByName("roof-vent").geometry.clone());
  if(i===1){box(2.6,2.3,2,0,1.15,0,stone);box(2.85,.17,2.25,0,2.38,0,trim);box(.88,1.82,.09,0,.91,1.04,timber);}
  if(i===2){for(const x of [-.72,.72])box(.13,.88,.18,x,.44,0,frame);
    piece(new T.CylinderGeometry(1.03,1.03,1.6,12),[0,1.6,0],"#93816a");}
  if(i===3)for(let j=0;j<3;j++){piece(new T.CylinderGeometry(.19,.22,.83+j*.14,8),[j*.65,.41+j*.07,0],frame);}
  if(i===4){box(2.62,.4,1.48,0,.2,0,frame);for(let j=0;j<4;j++)piece(new T.BoxGeometry(.61,.09,1.62).rotateX(-.19),[(j-1.5)*.65,.61,0],"#536f7b");}
  if(i===5){box(2.4,.43,1.4,0,.215,0,timber);for(let j=0;j<3;j++)piece(new T.IcosahedronGeometry(.55,0),[(j-1)*.67,.59,0],"#72865a");}
  finish("roof-equipment-"+i);
}
piece(new T.CylinderGeometry(.34,.34,.025,16),[0,.013,0],"#525655");finish("manhole");
piece(new T.CylinderGeometry(.14,.18,.66,10),[0,.33,0],"#a96145");
box(.51,.16,.18,0,.44,0,"#aa684c");piece(new T.SphereGeometry(.15,8,5),[0,.68,0],"#a6593d");finish("hydrant");
for(const x of [-1.95,1.95])box(.1,2.48,.1,x,1.24,.48,frame);
box(4.45,.16,1.55,0,2.55,0,"#687f79");box(3.5,.18,.48,0,.56,.26,timber);
for(const x of [-1.25,1.25])box(.12,.53,.32,x,.265,.26,frame);
box(.52,1.2,.12,-1.88,1.55,.42,stone);finish("bus-shelter");
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}};
const bytes=await new GLTFExporter().parseAsync(root,{binary:true});
await writeFile(new URL("../public/models/city-kit.glb",import.meta.url),new Uint8Array(bytes));
console.log("Exported",root.children.length,"representative city modules.");
