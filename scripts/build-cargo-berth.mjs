import { writeFile } from "node:fs/promises";
import * as T from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { jibReach, port, receivingBay } from "../src/scene/port-layout.ts";

const colors = {
  iron: "#334849", steel: "#647b77", yellow: "#dba444", lightYellow: "#f0be60",
  slab: "#b6b0a1", edge: "#d7cbb1", rust: "#956644", white: "#e6e1cf",
  wood: "#ab8054", timber: "#cd9e69", darkWood: "#77583f", rubber: "#333a39",
  cab: "#648b88", window: "#365961", shed: "#708b87", roof: "#526d70",
  brick: "#a8644b", lamp: "#fff1c4", rear: "#b65740", stripe: "#424846",
};
const root = new T.Group();
root.name = "CargoBerth";
function assembly(name, parent = root) {
  const result = new T.Group();
  result.name = name;
  parent.add(result);
  return result;
}
const steel = new T.MeshStandardMaterial({ name: "paint-and-steel", vertexColors: true, roughness: .78 });
const lights = new T.MeshStandardMaterial({ name: "work-lamps", vertexColors: true, roughness: .4 });
const unitBox = new T.BoxGeometry();
const up = new T.Vector3(0, 1, 0);

// A batch retains its own local origin so the turntable, hoist and pallet can move independently.
function batch(parent) {
  const solids = [], bulbs = [];
  function part(geometry, color, at, scale = [1,1,1], rotation = [0,0,0]) {
    const copy = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    const q = rotation instanceof T.Quaternion ? rotation : new T.Quaternion().setFromEuler(new T.Euler(...rotation));
    copy.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...at), q, new T.Vector3(...scale)));
    copy.deleteAttribute("uv");
    const rgb = new T.Color(colors[color]);
    const values = new Float32Array(copy.getAttribute("position").count * 3);
    for (let i = 0; i < values.length; i += 3) rgb.toArray(values, i);
    copy.setAttribute("color", new T.BufferAttribute(values, 3));
    (color === "lamp" ? bulbs : solids).push(copy);
  }
  function box(at, size, color, rotation, bevel = 0) {
    if (!bevel) return part(unitBox, color, at, size, rotation);
    part(new RoundedBoxGeometry(...size, 1, bevel), color, at, [1,1,1], rotation);
  }
  function cylinder(at, radius, height, color, rotation = [0,0,0], segments = 16) {
    part(new T.CylinderGeometry(radius, radius, height, segments), color, at, [1,1,1], rotation);
  }
  function beam(from, to, radius, color) {
    const a = new T.Vector3(...from), b = new T.Vector3(...to);
    const length = a.distanceTo(b);
    const direction = b.clone().sub(a).normalize();
    part(new T.CylinderGeometry(radius, radius, length, 8), color, a.lerp(b,.5).toArray(),
      [1,1,1], new T.Quaternion().setFromUnitVectors(up, direction));
  }
  function finish() {
    for (const [shapes, material] of [[solids,steel],[bulbs,lights]]) {
      if (!shapes.length) continue;
      const mesh = new T.Mesh(mergeVertices(mergeGeometries(shapes)), material);
      parent.add(mesh);
    }
  }
  return { box, cylinder, beam, part, finish };
}

const quay = batch(root);
const { box, cylinder, beam } = quay;
// Concrete caisson, rub rail, recessed joints and a steel access ladder at the berth face.
const edge = port.quayEdge - port.craneX;
const low = -12.8, high = 3.25;
box([edge,-.39,(low+high)/2],[.16,.80,high-low],"slab");
for (let z = low + .45; z < high; z += 2.35) {
  box([edge+.11,-.25,z],[.16,.73,.37],"rubber",[0,0,-.045],.035);
  box([edge+.19,-.26,z],[.05,.60,.26],"iron");
}
for (let z = low; z < high; z += 2.35) box([edge-.22,.022,z+.46],[.32,.035,.92],"yellow");
for (const z of [-8,2.88]) {
  box([edge-.45,.095,z],[.65,.16,.67],"iron",undefined,.045);
  cylinder([edge-.45,.31,z],.19,.36,"yellow");
  cylinder([edge-.45,.52,z],.255,.12,"yellow");
}
for (const z of [-8.98,-8.51]) {
  beam([edge+.18,-.94,z],[edge+.18,.28,z],.043,"steel");
  beam([edge+.18,.28,z],[edge-.15,.28,z],.044,"steel");
}
for(let y=-.84;y<.28;y+=.25)beam([edge+.18,y,-8.98],[edge+.18,y,-8.51],.034,"yellow");

// Slewing pedestal crane: bolted plinth, access ladder, cab, winch and a tapered lattice jib.
box([0,.15,0],[2.55,.30,2.4],"slab",undefined,.07);
cylinder([0,.37,0],.91,.18,"iron");
cylinder([0,1.18,0],.55,1.48,"steel");
cylinder([0,1.93,0],.87,.20,"yellow");
for(let i=0;i<12;i++) {
  const a=i*Math.PI/6;
  cylinder([.76*Math.cos(a),.49,.76*Math.sin(a)],.055,.065,"edge",undefined,6);
}
for (const z of [-.22,.22]) beam([-.77,.28,z],[-.77,2.09,z],.031,"iron");
for(let y=.46;y<2.1;y+=.27)beam([-.77,y,-.22],[-.77,y,.22],.026,"yellow");
const turntable = assembly("CraneTurntable");
const crane = batch(turntable);
crane.box([-.37,2.16,0],[2.95,.36,1.87],"iron",undefined,.08);
crane.box([-.86,2.77,0],[1.66,1.0,1.73],"yellow",undefined,.12);
crane.box([-1.65,2.68,0],[.59,.83,1.82],"steel",undefined,.09);
for(let z=-.64;z<=.65;z+=.22)crane.box([-1.96,2.65,z],[.035,.50,.10],"iron");
crane.box([.31,2.84,.60],[1.27,1.35,.87],"lightYellow",undefined,.09);
crane.box([.34,3.05,1.045],[.95,.76,.045],"window",undefined,.055);
crane.box([.956,3.05,.61],[.035,.76,.68],"window",undefined,.04);
crane.box([.31,3.57,.6],[1.44,.12,1.04],"iron",undefined,.045);
crane.box([.29,3.08,1.08],[.055,.8,.028],"lightYellow");
crane.box([.88,3.52,.82],[.22,.15,.24],"lamp");
crane.cylinder([-.48,3.31,-.10],.31,.85,"iron",[Math.PI/2,0,0]);
for(let z=-.48;z<.28;z+=.10)crane.cylinder([-.48,3.31,z],.315,.04,"steel",[Math.PI/2,0,0]);
const tipY=port.sheaveHeight;
const panels=7;
function chords(i) {
  const t=i/panels, x=.40+(jibReach-.40)*t, y=2.62+(tipY-2.62)*t;
  const w=.51-.34*t, depth=.76-.50*t;
  return [[x,y,-.24-w],[x,y,-.24+w],[x-depth,y+depth*.8,-.24-w],[x-depth,y+depth*.8,-.24+w]];
}
for(let i=0;i<panels;i++) {
  const a=chords(i), b=chords(i+1);
  for(let j=0;j<4;j++) crane.beam(a[j],b[j],.069,"yellow");
  for(const [j,k] of [[0,2],[1,3],[0,1],[2,3]]) {
    crane.beam(a[j],a[k],.034,"lightYellow");
    crane.beam(i%2?a[j]:a[k],i%2?b[k]:b[j],.036,"yellow");
  }
}
for(const z of [-.64,.22]){
  crane.beam([-1.37,3.24,z],[-.81,4.84,z],.091,"iron");
  crane.beam([.18,2.48,z],[-.81,4.84,z],.077,"iron");
  crane.beam([-.81,4.84,z],[jibReach-.23,tipY+.1,-.24],.028,"steel");
}
crane.cylinder([jibReach-.06,tipY,-.12],.24,.38,"iron",[Math.PI/2,0,0]);
crane.cylinder([jibReach-.06,tipY,.09],.125,.05,"yellow",[Math.PI/2,0,0]);
crane.finish();

const lines = assembly("HoistLines",turntable);
lines.position.set(jibReach,tipY,0);
const reeving=batch(lines);
for(const z of [-.085,.085])reeving.cylinder([0,-.5,z],.024,1,"iron");
reeving.finish();
const load = assembly("SlungPallet",turntable);
load.position.x=jibReach;
const sling=batch(load);
function crate(batch,x,y,z,w,h,d) {
  for(const side of [-1,1])batch.box([x+side*w*.31,y+.055,z],[.12,.11,d],"darkWood");
  batch.box([x,y+.15,z],[w,.08,d],"wood");
  batch.box([x,y+h/2+.19,z],[w-.06,h,d-.03],"timber");
  for(const side of [-1,1]){
    const zz=z+side*d/2;
    for (const dy of [.24,h+.14])batch.box([x,y+dy,zz],[w,.085,.045],"wood");
    batch.box([x,y+.19+h/2,zz],[.075,Math.hypot(h*.86,w*.87),.045],"wood",[0,0,-.92*side]);
  }
  for(const xx of [-.28,.28])batch.box([x+xx*w,y+.19+h/2,z],[.037,h+.035,d+.035],"iron");
}
crate(sling,0,0,0,.94,.58,1.04);
for (const x of [-.43,.43])for(const z of [-.46,.46])sling.beam([x,.76,z],[0,1.47,0],.019,"steel");
sling.part(new T.TorusGeometry(.113,.033,8,18,Math.PI*1.68),"yellow",[0,1.53,0],[1,1,1],[0,0,.36]);
sling.box([0,1.68,0],[.19,.18,.26],"iron",undefined,.04);
sling.finish();

// The trailer deck is the receiving point of the same slewing circle as the forward hatch.
const truck = assembly("QuaysideFlatbed");
truck.position.set(receivingBay.x,0,receivingBay.z);
const truckBody=batch(truck);
function axle(model,x,z,track,radius) {
  for(const side of [-1,1]) {
    model.cylinder([x,radius,z+side*track/2],radius,.24,"rubber",[Math.PI/2,0,0]);
    model.cylinder([x,radius,z+side*(track/2+.13)],radius*.54,.045,"steel",[Math.PI/2,0,0]);
    model.cylinder([x,radius,z+side*(track/2+.16)],radius*.24,.04,"edge",[Math.PI/2,0,0]);
  }
}
for(const x of [-2.41,.89])axle(truckBody,x,0,1.63,.405);
truckBody.box([-.5,.57,0],[5.25,.33,1.30],"iron",undefined,.05);
truckBody.box([0,.97,0],[3.64,.24,1.98],"cab");
truckBody.box([0,1.115,0],[3.57,.05,1.91],"wood");
for (const z of [-.96,.96])for(let x=-1.45;x<1.8;x+=.57)truckBody.box([x,.97,z],[.055,.23,.06],"edge");
truckBody.box([-2.43,1.29,0],[1.64,.99,1.86],"cab",undefined,.14);
truckBody.box([-2.48,1.99,0],[1.35,.83,1.73],"window",undefined,.09);
truckBody.box([-2.46,2.43,0],[1.48,.13,1.89],"white",undefined,.06);
for(const x of [-3.11,-1.83])for(const z of [-.84,.84])truckBody.box([x,1.99,z],[.09,.84,.09],"cab");
truckBody.box([-3.28,1.13,0],[.045,.24,.85],"iron");
for(const z of [-.64,.64])truckBody.box([-3.28,1.28,z],[.06,.16,.31],"white");
for(const side of [-1,1]) {
  truckBody.beam([-2.91,1.83,side*.86],[-2.97,1.91,side*1.04],.025,"iron");
  truckBody.box([-2.97,1.97,side*1.07],[.12,.22,.08],"iron",undefined,.024);
}
truckBody.box([-3.30,.85,0],[.17,.14,1.94],"steel");
for(const z of [-.77,.77])truckBody.box([1.84,.87,z],[.045,.13,.24],"rear");
truckBody.finish();

// Open-front transit shed with a corrugated pitched roof, visible trusses and pallet bays.
const shedX=-4.72, shedZ=9.44, shedWidth=3.65, shedLength=5.45;
box([shedX,.09,shedZ],[shedWidth+.30,.18,shedLength+.26],"slab");
box([shedX-shedWidth/2,1.52,shedZ],[.11,2.84,shedLength],"shed");
for(const end of [-1,1]) {
  box([shedX,1.52,shedZ+end*shedLength/2],[shedWidth,2.84,.10],"shed");
  for(let x=-1.6;x<=1.7;x+=.28)box([shedX+x,1.52,shedZ+end*(shedLength/2+.062)],[.047,2.82,.035],"steel");
}
for(const z of [-2.72,0,2.72]){
  for(const side of [-1,1]){
    const x=shedX+side*shedWidth/2;
    box([x,1.56,shedZ+z],[.15,2.94,.15],"iron");
    beam([x,2.98,shedZ+z],[shedX,3.67,shedZ+z],.072,"iron");
    beam([x,2.44,shedZ+z],[x-side*.54,3.17,shedZ+z],.047,"iron");
  }
  beam([shedX-1.85,2.98,shedZ+z],[shedX+1.85,2.98,shedZ+z],.052,"iron");
}
for(const side of [-1,1]){
  box([shedX+side*.97,3.34,shedZ],[2.15,.105,shedLength+.42],"roof",[0,0,-side*.36]);
  for(let z=-2.75;z<2.9;z+=.38)box([shedX+side*.97,3.416,shedZ+z],[2.14,.05,.045],"steel",[0,0,-side*.36]);
}
for(const [x,z] of [[0,-1.72],[-.72,.07],[.62,.25]])crate(quay,shedX+x,.18,shedZ+z,.94,.7,1.04);
crate(quay,shedX,.18+.89,shedZ-1.72,.9,.62,1.0);

// Forklift points toward the open shed. Forks rest just above the concrete.
const lift = assembly("Forklift");
lift.position.set(-.42,0,7.25);
lift.rotation.y=-2.72;
const fork=batch(lift);
axle(fork,-.62,0,1.04,.27); axle(fork,.54,0,1.09,.35);
fork.box([-.06,.59,0],[1.82,.58,1.12],"yellow",undefined,.13);
fork.box([-.77,.87,0],[.52,.65,1.18],"lightYellow",undefined,.12);
fork.box([-.15,1.06,0],[.54,.14,.56],"iron",undefined,.05);
fork.box([-.39,1.26,0],[.13,.44,.56],"iron",[0,0,.15],.035);
for(const x of [-.55,.47])for(const z of [-.48,.48])fork.box([x,1.45,z],[.065,1.30,.075],"iron");
for(const z of [-.52,.52])fork.box([-.04,2.13,z],[1.26,.10,.10],"yellow");
for(let x=-.59;x<.57;x+=.22)fork.box([x,2.13,0],[.084,.08,1.01],"yellow");
fork.cylinder([-.48,2.22,-.44],.076,.15,"rust");
fork.cylinder([.91,1.19,0],.075,1.45,"steel");
for (const z of [-.22,.22])fork.box([1.05,1.12,z],[.055,.68,.045],"iron");
for(const z of [-.41,.41]){
  fork.box([.89,1.18,z],[.15,2.21,.10],"iron");
  fork.box([.99,.87,z],[.08,1.43,.063],"steel");
  fork.box([1.06,.49,z],[.12,.77,.12],"yellow");
  fork.box([1.59,.15,z],[1.16,.08,.14],"steel");
}
fork.box([.90,2.25,0],[.18,.12,.95],"iron");
fork.box([1.06,.77,0],[.10,.13,1.05],"iron");
fork.cylinder([.32,1.28,0],.20,.045,"rubber",[0,0,-.6]);
fork.finish();

// The gate opens onto the return street. The north rail separates the public walk from the yard.
function guardRail(a,b) {
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const count=Math.ceil(length/1.55);
  for(let i=0;i<=count;i++){
    const x=a[0]+(b[0]-a[0])*i/count, z=a[1]+(b[1]-a[1])*i/count;
    box([x,.53,z],[.09,1.06,.09],"steel");
  }
  for(const y of [.48,1.04])beam([a[0],y,a[1]],[b[0],y,b[1]],.034,"steel");
}
guardRail([-8.48,13.13],[2.13,13.13]);guardRail([2.13,13.13],[2.13,3.35]);
guardRail([-8.48,13.13],[-8.48,-2.45]);guardRail([-8.48,-9.7],[-8.48,-12.4]);
for(const z of [-2.6,-9.55]) {
  cylinder([-8.49,.52,z],.13,1.04,"yellow");cylinder([-8.49,.70,z],.133,.20,"stripe");
}
for(let x=-7.85;x<1.95;x+=.66)box([x,.02,3.65],[.11,.025,1.1],"yellow",[0,.62,0]);
for(let i=0;i<3;i++)crate(quay,-4.6+(i%2)*1.1,0,3.0+Math.floor(i/2)*1.16,1,.72,1);
for(const x of [-6.5,-5.33])crate(quay,x,0,-10.34,1,.72,1);
const mastX=-6.75,mastZ=-1.5;
cylinder([mastX,2.63,mastZ],.105,5.26,"steel");
box([mastX,5.28,mastZ],[.17,.14,1.35],"iron");
for(const z of [-.49,.49]){
  box([mastX+.07,5.31,mastZ+z],[.32,.23,.42],"iron",[0,0,-.45]);
  box([mastX+.20,5.24,mastZ+z],[.06,.16,.34],"lamp",[0,0,-.45]);
}
// Receiving bays, the gate drain, and a hose reel stay outside the slewing envelope.
for(const [x,z,w,d] of [[-4.05,3.48,2.4,2.52],[-5.91,-10.35,2.7,1.5]]) {
  for(const side of [-1,1]) {
    box([x+side*w/2,.023,z],[.065,.012,d],"white");
    box([x,.023,z+side*d/2],[w,.012,.065],"white");
  }
}
box([-7.0,.023,-6.1],[.28,.014,6.1],"iron");
for(let z=-9.04;z<-3.1;z+=.20)box([-7,.038,z],[.265,.018,.038],"steel");
for(const side of [-1,1]) {
  box([-6.04,.35,-1.35+side*.38],[.96,.68,.075],"steel");
  cylinder([-6.04,.69,-1.35+side*.35],.42,.068,"rust",[Math.PI/2,0,0]);
}
for(let i=0;i<8;i++)cylinder([-6.04,.69,-1.64+i*.083],.32,.076,"iron",[Math.PI/2,0,0]);
const lifeRing = new T.TorusGeometry(.26,.063,8,24);
quay.part(lifeRing,"rear",[edge-.48,1.01,-9.75],[1,1,1],[0,Math.PI/2,0]);
box([edge-.55,.60,-9.75],[.09,1.2,.09],"steel");
for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5])
  box([edge-.47,1.01+Math.sin(angle)*.26,-9.75+Math.cos(angle)*.26],[.125,.093,.125],"white",[-angle,0,0]);
quay.finish();
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result=result; this.onloadend?.(); });
  }
};
const glb = await new GLTFExporter().parseAsync(root,{binary:true});
await writeFile(new URL("../public/models/cargo-berth.glb",import.meta.url),new Uint8Array(glb));
console.log("Exported cargo-berth.glb ("+glb.byteLength+" bytes).");
