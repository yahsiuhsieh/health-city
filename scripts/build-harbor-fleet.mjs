import * as T from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { writeFile } from "node:fs/promises";

const root = new T.Group();
const paint = new T.MeshStandardMaterial({ vertexColors:true, roughness:.77 });
const timber = "#996f48", ivory = "#e8dcbe", rubber = "#313b3d", glass = "#344f5a";
const dimensions={Schooner:[11.2,3.4,1],Trawler:[20,6.5,1.48],Tug:[24,9,1.76],
  Freighter:[58,10.5,1.56],WaterTaxi:[12,4,1],Motorboat:[7,2.4,1]};
let parts = [];
let captainJoint;
function part(geometry, color, position, rotation) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  if (rotation) g.applyQuaternion(rotation);
  g.translate(...position);
  g.deleteAttribute("uv");
  const rgb = new T.Color(color);
  const colors = new Float32Array(g.attributes.position.count*3);
  for(let i=0;i<colors.length;i+=3) rgb.toArray(colors,i);
  g.setAttribute("color",new T.BufferAttribute(colors,3));
  if(captainJoint!==undefined)g.setAttribute("joint",new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(captainJoint),1));
  parts.push(g);
}
function box(x,y,z,w,h,d,c) { part(new T.BoxGeometry(w,h,d),c,[x,y,z]); }
function oval(x,y,z,w,h,d,c) { part(new T.SphereGeometry(1,14,10).scale(w,h,d),c,[x,y,z]); }
function beam(a,b,r,c,top=r) {
  const delta=new T.Vector3(...b).sub(new T.Vector3(...a));
  const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());
  part(new T.CylinderGeometry(top,r,delta.length(),10),c,a.map((v,i)=>(v+b[i])/2),q);
}
function finish(name) {
  const geometry=mergeVertices(mergeGeometries(parts));
  const pos=geometry.attributes.position,normal=geometry.attributes.normal,colors=geometry.attributes.color;
  for(let i=0;i<pos.count;i++){
    const shade=(normal.getY(i)<-.45?.81:1)*(.93+.07*Math.min(1,Math.max(0,pos.getY(i))));
    colors.setXYZ(i,colors.getX(i)*shade,colors.getY(i)*shade,colors.getZ(i)*shade);
  }
  const mesh=new T.Mesh(geometry,paint);
  if(dimensions[name]){
    const [length,beam,heightScale]=dimensions[name],g=mesh.geometry;
    g.computeBoundingBox();
    const size=g.boundingBox.getSize(new T.Vector3()),mid=g.boundingBox.getCenter(new T.Vector3());
    g.translate(-mid.x,0,-mid.z);g.scale(length/size.x,heightScale,beam/size.z);
  }
  mesh.name=name;
  root.add(mesh);
  parts=[];
}
// Longitudinal stations shape the stern, bilges, sheer and narrow bow.
function hull(length,width,height,color,deck=timber) {
  const stations=[[-.50,.57,.94],[-.46,.88,.91],[-.30,1,.86],[.15,1,.85],[.32,.84,.89],[.44,.49,.97],[.50,.035,1.06]];
  const rings=stations.map(([u,b,s])=>[[-.36,-.6],[-.83,-.14],[-.88,.045],[-1,s],[1,s],[.88,.045],[.83,-.14],[.36,-.6]].map(([w,y])=>[u*length-Math.sign(u)*Math.max(0,(Math.abs(u)-.31)/.19)*Math.max(0,s-y)*width*.14,y*height,w*b*width/2]));
  function face(a,b,c,d,tint) {
    const g=new T.BufferGeometry();
    g.setAttribute("position",new T.Float32BufferAttribute((a===d?[a,b,c]:[a,b,c,a,c,d]).flat(),3));
    g.computeVertexNormals();
    part(g,tint,[0,0,0]);
  }
  for(let i=1;i<rings.length;i++) for(let j=0;j<8;j++) {
    const k=(j+1)%8, a=rings[i-1], b=rings[i];
    face(a[j],a[k],b[k],b[j],j===3?deck:j===1||j===5?"#343e41":j===0||j>=6?"#844b3e":color);
  }
  for(const i of [0,rings.length-1]) {
    const ring=i?[...rings[i]].reverse():rings[i];
    for(let j=1;j<ring.length-1;j++) face(ring[0],ring[j+1],ring[j],ring[0],color);
  }
  box(-length*.03,-height*.61,0,length*.69,.18,.14,rubber);
  box(-length*.435,-height*.43,0,.36,height*.53,.085,rubber);
  for(let i=0;i<3;i++){
    const a=i*2*Math.PI/3,y=-height*.49;
    beam([-length*.405,y,0],[-length*.40,y+.28*Math.sin(a),.28*Math.cos(a)],.09,"#9b8254",.045);
  }
  for(const side of [-1,1]){
    const hawse=[length*.37,height*.72,side*width*.32];
    oval(...hawse,.13,.12,.08,rubber);
    beam(hawse,[hawse[0]-.05,hawse[1]-.25,hawse[2]],.041,rubber);
    box(hawse[0]-.06,hawse[1]-.24,hawse[2],.32,.075,.12,rubber);
    for(const x of [-length*.32,length*.32]){
      beam([x,height*.91,side*width*.31],[x,height*.91+.24,side*width*.31],.078,rubber);
      box(x,height*.91+.24,side*width*.31,.27,.07,.12,rubber);
    }
    const z=side*width*.43;
    for(let x=-length*.32;x<length*.34;x+=.82)beam([x,height*.9,z],[x,height*.9+.55,z],.025,ivory);
    beam([-length*.32,height*.9+.55,z],[length*.33,height*.9+.55,z],.026,ivory);
    for(const x of [-length*.25,length*.24])oval(x,height*.51,side*width*.48,.14,.25,.12,rubber);
  }
}
function cabin(x,y,w,h,d,c) {
  box(x,y+h/2,0,w,h,d,c);
  box(x,y+h+.06,0,w+.28,.15,d+.26,ivory);
  for(const side of [-1,1]){
    for(let i=0;i<4;i++) box(x+w*(i-1.5)*.23,y+h*.68,side*(d/2+.015),w*.17,h*.36,.06,glass);
    box(x+side*(w/2+.025),y+h*.68,0,.06,h*.36,d*.75,glass);
  }
}
function cargo(x,y,z,tint,w=4.4,h=1.65,d=1.65) {
  box(x,y+h/2,z,w,h,d,tint);
  for(const side of [-1,1]) for(let k=1;k<13;k++)
    box(x-w/2+k*w/13,y+h/2,z+side*d/2,.045,h*.93,.045,tint);
}
hull(13,3,1.05,ivory);
cabin(-2,.89,2.5,.59,1.65,timber);
for(const [x,h] of [[-2.4,8.1],[1.3,9.4]]) {
  beam([x,1,0],[x,h,0],.11,timber,.055);
  beam([x-3.1,2.45,0],[x+.25,2.65,0],.18,"#d5b775");
  for(let j=0;j<7;j++) oval(x-2.85+j*.45,2.55+j*.025,0,.33,.15+(j%3)*.037,.22,"#c69a54");
  for(const side of [-1,1]) beam([x,h-.18,0],[x-1.2,.98,side*1.43],.023,rubber);
  beam([x,h,0],[6.9,1.72,0],.025,timber);
}
beam([5.1,1.03,0],[7,1.75,0],.11,timber,.045);
finish("Schooner");
hull(12,3.8,1.48,"#356f78");
cabin(2.3,1.29,3.45,2.05,2.95,ivory);
for(const side of [-1,1]){
  beam([-4,1.35,side*1.5],[-2.6,5.15,side*.9],.14,rubber);
  beam([-.8,1.35,side*1.5],[-2.6,5.15,side*.9],.14,rubber);
}
beam([-2.6,5.15,-.95],[-2.6,5.15,.95],.14,rubber);
beam([-2.6,2,-1],[-2.6,2,1],.77,"#79744c");
for(const side of [-1,1]){
  for(const x of [-4.8,-3,-1.2]) beam([x,1.27,side*1.56],[x,1.94,side*1.56],.045,ivory);
  beam([-4.8,1.94,side*1.56],[-1.2,1.94,side*1.56],.052,ivory);
}
beam([2.4,3.45,0],[2.4,5.5,0],.08,ivory);
for(const side of [-1,1]){
  beam([-3,1.47,side*1.37],[-.54,4.6,side*1.51],.085,"#aa9271");
  beam([-.54,4.6,side*1.51],[-2.6,5.06,side*.9],.023,rubber);
  part(new T.TorusGeometry(.24,.075,6,12),"#ba6648",[2.94,2.08,side*1.51]);
}
finish("Trawler");
hull(10,4.3,1.45,"#a54936");
cabin(.5,1.25,3.3,2.2,2.85,"#daa54c");
for(const x of [-3.1,3.05]) for(const z of [-1,1]){
  beam([x,1.24,z],[x,1.67,z],.11,rubber);
  box(x,1.65,z,.46,.11,.14,rubber);
}
beam([.58,3.52,0],[.58,4.54,0],.063,ivory);
beam([.58,4.24,-.52],[.58,4.24,.52],.048,ivory);
beam([-2.1,1.35,0],[-2.1,3.85,0],.42,"#ab503c",.33);
beam([-2.1,3.56,0],[-2.1,3.94,0],.37,rubber);
for(const side of [-1,1]) for(let i=-3;i<=3;i++)
  part(new T.TorusGeometry(.4,.14,8,14),rubber,[i*1.02,1.03,side*(2.09-.08*Math.abs(i))]);
beam([-3.1,1.37,0],[-3.1,1.76,0],.19,rubber);
beam([-3.1,1.76,0],[-3.53,1.81,0],.11,rubber);
beam([-3.53,1.81,0],[-3.61,1.97,0],.075,rubber);
finish("Tug");
hull(32,6.3,2.55,"#335673","#798282");
cabin(-10.8,2.3,4.2,3.2,4.5,ivory);
cabin(-10.8,5.57,4.5,1.15,4.8,ivory);
for(const side of [-1,1]){
  for(let i=0;i<5;i++) beam([9+i*.99,2.4,side*(2.65-i*.33)],[9+i*.99,2.94,side*(2.65-i*.33)],.044,ivory);
  beam([9,2.94,side*2.65],[12.96,2.94,side*1.33],.043,ivory);
}
beam([-10.8,6.75,0],[-10.8,8.35,0],.08,ivory);
beam([-10.8,7.85,-.78],[-10.8,7.85,.78],.06,ivory);
beam([-12.8,3.7,0],[-12.8,6.25,0],.62,rubber);
for(const x of [-2.5,7.7]){
  cargo(x,2.31,0,x<0?"#737d78":"#878c80",7.2,.69,4.7);
  const pedestal=x-4.2;
  beam([pedestal,2.3,-1.8],[pedestal,6.4,-1.8],.26,"#b89b68");
  beam([pedestal,5.72,-1.8],[pedestal+2.9,7.25,-1.1],.19,"#d0b27f",.1);
  beam([pedestal+2.9,7.25,-1.1],[pedestal+2.9,6.16,-1.1],.035,rubber);
}
for(const side of [-1,1]){
  for(let i=0;i<4;i++)box(-10.8+(i-1.5)*.96,3.25,side*2.27,.64,.48,.055,glass);
  part(new T.TorusGeometry(.27,.081,6,14),"#bb674a",[-9.2,5.18,side*2.29]);
}
cabin(-10.7,6.86,3.1,.9,3.65,ivory);
finish("Freighter");

hull(7,2.4,.78,"#e1d6bb");
cabin(.2,.66,.98,.69,.79,ivory);
box(-2.9,.84,0,.68,.76,.56,rubber);
box(-1.24,.93,0,.48,.49,1.45,"#a98059");
finish("Motorboat");

hull(12,4,1.13,"#377973");
cabin(-.9,1.0,7.35,2.14,3.12,"#d9c8a4");
box(-.9,3.28,0,7.85,.21,3.62,"#b77945");
finish("WaterTaxi");
// Joint IDs match the articulated captain in HarborFleet.
for(const [i,side] of [-1,1].entries()) {
  const x=side*.126;
  captainJoint=3+i*2;
  oval(x,.085,.055,.102,.087,.17,rubber);
  beam([x,.14,0],[x,.48,0],.092,"#364755",.10);
  captainJoint=2+i*2;
  beam([x,.48,0],[x*.82,.89,0],.10,"#364755",.12);
  captainJoint=6+i*2;
  beam([side*.216,1.37,0],[side*.246,1.11,.014],.084,"#304454");
  captainJoint=7+i*2;
  beam([side*.246,1.11,.014],[side*.246,.94,.05],.065,"#304454");
  oval(side*.246,.92,.06,.065,.085,.07,"#b9886a");
}
captainJoint=0;
oval(0,1.12,0,.25,.39,.16,"#304454");
captainJoint=1;
oval(0,1.6,0,.146,.195,.14,"#bc9072");
oval(0,1.556,.064,.126,.105,.094,"#655d51");
oval(0,1.6,.14,.041,.048,.042,"#c99876");
for(const side of [-1,1]){
  captainJoint=1;
  oval(side*.057,1.637,.127,.019,.013,.012,"#433e39");
  oval(side*.14,1.599,0,.023,.043,.029,"#bd9071");
  captainJoint=0;
  beam([side*.106,1.429,.10],[side*.031,1.267,.155],.025,"#526174");
}
captainJoint=1;
oval(0,1.75,.025,.174,.065,.17,ivory);
oval(0,1.71,.13,.15,.022,.09,rubber);
captainJoint=0;
for(const x of [-.075,.075]) for(const y of [1.06,1.2,1.34]) oval(x,y,.146,.016,.018,.012,"#bd994f");
finish("Captain");
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.()})}};
await writeFile(new URL("../public/models/harbor-fleet.glb",import.meta.url),new Uint8Array(await new GLTFExporter().parseAsync(root,{binary:true})));
