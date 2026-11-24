import { deckSockets as sockets } from "../src/scene/sleep/deck-sockets.ts";
import { mkdir, writeFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// Editable source for the representative cargo boat. One unit equals one metre.
// The bow points along positive X. The browser loads the exported GLB.
const cityBerth = process.argv.includes("--city");
const boat = new THREE.Group();
boat.name = "HealthCity working cargo boat";
const colors = {
  red: "#a7503c", cream: "#eee0bf", rail: "#374443", frame: "#56635e",
  glass: "#36555b", deck: "#ad8552", seam: "#846844", rubber: "#354240",
  coral: "#c9693f", brass: "#bc9758", crane: "#d9a34b", stack: "#3f4e51",
  hatch: "#b68a54", rope: "#c9af7e", plateSeam: "#854535",
};
const materials = Object.fromEntries(Object.entries(colors).map(([name, color]) => [
  name, new THREE.MeshStandardMaterial({
    name, color, roughness: name === "glass" ? .3 : .73,
    metalness: name === "brass" || name === "rail" ? .18 : 0,
  }),
]));
materials.hull = new THREE.MeshStandardMaterial({
  name: "painted hull plates", vertexColors: true, roughness: .78,
});

const geometryCache = new Map();
function geometry(key, create) {
  if (!geometryCache.has(key)) geometryCache.set(key, create());
  return geometryCache.get(key);
}
function mesh(shape, material, at, name = "", parent = boat) {
  const item = new THREE.Mesh(shape, materials[material]);
  item.position.set(...at);
  item.name = name || material;
  parent.add(item);
  return item;
}
function box(size, at, material, radius = .035, name = "", parent = boat) {
  const corner = Math.min(radius, Math.min(...size) * .45);
  const key = "box:" + size.join(",") + ":" + corner;
  return mesh(geometry(key, () => cityBerth ? new THREE.BoxGeometry(...size) : new RoundedBoxGeometry(...size, 1, corner)), material, at, name, parent);
}
function cylinder(radius, height, at, material, name = "", parent = boat) {
  const key = "cylinder:" + radius + ":" + height;
  return mesh(geometry(key, () => new THREE.CylinderGeometry(radius, radius, height, cityBerth ? 10 : 16)), material, at, name, parent);
}
function beam(a, b, radius, material, parent = boat) {
  const from = new THREE.Vector3(...a);
  const to = new THREE.Vector3(...b);
  const item = cylinder(radius, from.distanceTo(to), from.clone().add(to).multiplyScalar(.5).toArray(), material, "", parent);
  item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize());
  return item;
}
function pathTube(points, radius, material, closed = false, parent = boat) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)), closed, "centripetal");
  return mesh(new THREE.TubeGeometry(curve, Math.max(12, points.length * (cityBerth ? 1 : 3)), radius, cityBerth ? 5 : 6, closed), material, [0, 0, 0], "", parent);
}
function ring(radius, thickness, at, material, parent = boat) {
  const key = "ring:" + radius + ":" + thickness;
  return mesh(geometry(key, () => new THREE.TorusGeometry(radius, thickness, cityBerth ? 5 : 8, cityBerth ? 12 : 20)), material, at, "", parent);
}

// Hull stations define the beam at the deck. The underside narrows to the keel.
const stations = [[10,0],[8.2,1.4],[5.5,2.43],[2.6,2.78],[-4.9,2.78],
  [-7.7,2.45],[-9.55,1.55],[-9.94,.72],[-9.94,-.72],[-9.55,-1.55],
  [-7.7,-2.45],[-4.9,-2.78],[2.6,-2.78],[5.5,-2.43],[8.2,-1.4]];
const sections = new THREE.CatmullRomCurve3(stations.map(([x,z])=>new THREE.Vector3(x,0,z)),true);
const outline = sections.getPoints(cityBerth?72:120).slice(0,-1);
// Allow for the rubbing strake when setting the overall dimensions.
const extents=new THREE.Box3().setFromPoints(outline);
for(const p of outline){
  p.x=(p.x-(extents.min.x+extents.max.x)/2)*19.87/(extents.max.x-extents.min.x);
  p.z*=5.47/(extents.max.z-extents.min.z);
  // Parallel sides preserve deck width along the entire wheelhouse.
  const midship=THREE.MathUtils.smoothstep(p.x,-8,-5.9)*(1-THREE.MathUtils.smoothstep(p.x,2.8,5.6));
  p.z=THREE.MathUtils.lerp(p.z,Math.sign(p.z)*2.77,midship);
}
const sheer = x => 1.32 + .45*Math.max(0,(x-4)/6)**2 + .16*Math.max(0,(-x-6)/4)**2;
const rings = [[.12,-1.72,"#422f2c"],[.65,-1.4,"#58352f"],[.91,-.43,"#683d34"],
  [.96,.02,"#874132"],[.985,.66,"#a04b39"],[1,null,"#ae5540"]];
const vertices=[], colorsHull=[], indices=[];
for(const [row,[scale,y,tint]] of rings.entries()){
  for(const [i,p] of outline.entries()){
    vertices.push(p.x*(.7+.3*scale),y??sheer(p.x),p.z*scale);
    const color=new THREE.Color(tint).multiplyScalar(.96+.05*Math.sin(i*.72+row*2));
    colorsHull.push(color.r,color.g,color.b);
    if(row===0)continue;
    const n=outline.length,a=(row-1)*n+i,b=(row-1)*n+(i+1)%n;
    indices.push(a,a+n,b,b,a+n,b+n);
  }
}
const hull=new THREE.BufferGeometry();
hull.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
hull.setAttribute("color",new THREE.Float32BufferAttribute(colorsHull,3));
hull.setIndex(indices);hull.computeVertexNormals();
mesh(hull,"hull",[0,0,0],"cargo-hull");
function deckSurface(scaleX,scaleZ,y,material,name){
  const shape=new THREE.Shape(outline.map(p=>new THREE.Vector2(p.x*scaleX,-p.z*scaleZ)));
  const g=new THREE.ShapeGeometry(shape);g.rotateX(-Math.PI/2);
  mesh(g,material,[0,y,0],name);
}
deckSurface(.995,.995,1.3,"deck","open-cargo-deck");
for(let z=-2.45;z<=2.45;z+=.27){
  const ends=[];
  for(let i=0;i<outline.length;i++){
    const a=outline[i],b=outline[(i+1)%outline.length];
    if((a.z>z)!==(b.z>z))ends.push(a.x+(b.x-a.x)*(z-a.z)/(b.z-a.z));
  }
  if(ends.length===2){
    const [west,east]=ends.sort((a,b)=>a-b);
    box([east-west-.23,.012,.015],[(west+east)/2,1.302,z],"seam",.002,"plank-joint");
  }
}
deckSurface(.736,.12,-1.72,"rail","hull-bottom");
box([13,.16,.23],[-.3,-1.72,0],"rail",.04,"keel");
box([.8,.88,.12],[-8.9,-.95,0],"rail",.06,"rudder");
const propeller=new THREE.Group();propeller.name="propeller";propeller.position.set(-8.3,-1.04,0);boat.add(propeller);
for(let i=0;i<3;i++){
  const pivot=new THREE.Group();pivot.rotation.x=i*2*Math.PI/3;propeller.add(pivot);
  box([.09,.43,.2],[0,.20,0],"brass",.05,"blade",pivot);
}
for(const [height,scale] of [[.48,.98],[.91,.992]]){
  pathTube(outline.map(p=>[p.x*(.7+.3*scale),height,p.z*scale]),.014,"plateSeam",true);
}
pathTube(outline.map(p=>[p.x,sheer(p.x),p.z]),.03,"cream",true);
for(const sign of [-1,1]){
  // Both boarding gates interrupt the rails amidships.
  const side=outline.filter(p=>p.z*sign>=0);
  for(const run of [side.filter(p=>p.x<-.05),side.filter(p=>p.x>1.15)]){
    run.sort((a,b)=>a.x-b.x);
    for(const h of [.49,1])pathTube(run.map(p=>[p.x,sheer(p.x)+h,p.z]),.029,"rail");
    for(let i=0;i<run.length;i+=cityBerth?3:5){
      const p=run[i];beam([p.x,sheer(p.x),p.z],[p.x,sheer(p.x)+1,p.z],.03,"rail");
    }
  }
}
// The wheelhouse has transparent glazing, open doors and a clear interior.
materials.glass.transparent=true;materials.glass.opacity=.31;materials.glass.depthWrite=false;
const house=new THREE.Group();house.name="wheelhouse";boat.add(house);
const seatX=-2.65,roof=3.76;
box([4.32,.16,3.72],[-3.4,3.68,0],"cream",.07,"roof",house);
function windowPanel(x,z,w,side){
  const size=side?[w,1.03,.024]:[.034,1.03,w];
  box(size,[x,2.97,z],"glass",.016,"cabin-window",house);
  const g=mergeGeometries(Array.from({length:7},(_,i)=>
    new THREE.BoxGeometry(size[0],.129,size[2]).translate(0,-.071-i*.147,0)));
  const shutter=mesh(g,"seam",[x+(side?0:Math.sign(x+3.4)*.05),3.49,z+(side?-Math.sign(z)*.028:0)],"cabin-shutter",house);
  shutter.scale.y=.06;
}
for(const z of [-1.8125,1.8125]){
  for(const [x,w] of [[-4.86,1.28],[-2.28,1.96]]){
    box([w,1.15,.025],[x,1.875,z],"cream",.025,"side-wall",house);
    for(const edge of [-1,1])box([.085,1.15,.025],[x+edge*(w-.085)/2,3.02,z],"cream",.018,"window-post",house);
    windowPanel(x,z,w-.14,true);
    box([w,.09,.075],[x,2.44,z-Math.sign(z)*.03],"deck",.02,"window-sill",house);
    box([w,.11,.055],[x,1.42,z-Math.sign(z)*.02],"seam",.02,"house-trim",house);
  }
  box([1.0,.22,.10],[-3.72,3.49,z],"cream",.02,"door-header",house);
}
for(const x of [-5.545,-1.255]){
  box([.09,1.15,3.6],[x,1.875,0],"cream",.03,"end-wall",house);
  for(let i=0;i<5;i++){
    const z=-1.44+.72*i;
    windowPanel(x,z,.62,false);
    box([.095,1.16,.07],[x,3.02,z-.35],"cream",.02,"window-post",house);
  }
}
box([1.02,.62,1.6],[-1.84,1.62,0],"frame",.08,"instrument-console");
for(const z of [-.43,0,.43])cylinder(.11,.05,[-1.88,1.96,z],"brass","gauge");
ring(.29,.034,[-2.35,2.18,0],"rail").rotation.y=Math.PI/2;
for(let i=0;i<4;i++){
  const a=i*Math.PI/2;beam([-2.35,2.18,0],[-2.35,2.18+.28*Math.cos(a),.28*Math.sin(a)],.017,"brass");
}
cylinder(.12,.46,[seatX-.38,1.53,0],"frame");
box([.52,.13,.56],[seatX-.38,1.83,0],"deck",.06,"helm-seat");
box([.11,.47,.56],[seatX-.64,2.05,0],"deck");
box([.85,.10,1.05],[-4.87,2.04,.92],"deck",.04,"chart-table");
cylinder(.09,.71,[-4.87,1.67,.92],"frame");
cylinder(.12,.22,[-5.09,2.2,1.19],"brass","chart-lamp");
for(const side of [-1,1]){
  box([2.35,.12,1],[-3.4,roof-.06,side*2.30],"deck",.045,side<0?"bridge-wing":"bridge-wing-starboard");
  for(const dx of [-1.1,0,1.1])beam([-3.4+dx,roof,side*2.76],[-3.4+dx,roof+1,side*2.76],.04,"rail");
  beam([-4.55,roof+1,side*2.76],[-2.25,roof+1,side*2.76],.045,"rail");
}
for(const z of [-.36,.36])beam([-5.71,1.3,z],[-5.71,roof+.55,z],.035,"rail");
for(let y=1.53;y<roof;y+=.29)beam([-5.71,y,-.36],[-5.71,y,.36],.034,"rail");

const hatches=new THREE.Group();hatches.name="cargo-hatches";boat.add(hatches);
box([3.2,.32,2.4],[3.25,1.47,0],"seam",.055,"coaming",hatches);
for(let i=0;i<8;i++)box([.37,.14,2.34],[1.85+i*.4,1.69,0],"hatch",.035,"timber-cover",hatches);
for(const x of [2.24,4.24])box([.075,.045,2.36],[x,1.784,0],"rail",.01,"hatch-strap",hatches);
// A fixed cargo derrick provides a recognizable working silhouette.
const crane = new THREE.Group();
crane.name = "cargo-crane";
boat.add(crane);
cylinder(.29, .23, [2.65, 1.24, -.63], "rail", "", crane);
cylinder(.18, .93, [2.65, 1.8, -.63], "crane", "", crane);
cylinder(.23, .12, [2.65, 2.3, -.63], "rail", "", crane);
const heel = new THREE.Vector3(2.65, 2.25, -.63);
const tip = new THREE.Vector3(.62, 3.61, -.63);
for (const z of [-.74, -.52]) {
  const a = heel.clone().setZ(z), b = tip.clone().setZ(z);
  const arm = box([.16, a.distanceTo(b), .09], a.clone().add(b).multiplyScalar(.5).toArray(), "crane", .035, "", crane);
  arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
}
for (const point of [heel, tip]) {
  cylinder(.15, .34, point.toArray(), "rail", "", crane).rotation.x = Math.PI / 2;
  cylinder(.07, .38, point.toArray(), "brass", "", crane).rotation.x = Math.PI / 2;
}
beam([2.65, 2.27, -.63], [.61, 3.77, -.63], .012, "rail", crane);
beam([.62, 3.61, -.63], [.62, 2.72, -.63], .012, "rail", crane);
cylinder(.065, .14, [.62, 2.65, -.63], "rail", "", crane);
const hook = mesh(new THREE.TorusGeometry(.1, .03, 8, 16, Math.PI * 1.55), "rail", [.62, 2.51, -.63], "", crane);
hook.rotation.z = Math.PI * .1;
cylinder(.23, .48, [3.23, 1.46, -.25], "rail", "deck-winch", crane).rotation.x = Math.PI / 2;
for (let i = 0; i < 8; i++) {
  ring(.235, .018, [3.23, 1.46, -.45 + i * .055], "rope", crane);
}
beam([3.23, 1.7, -.25], [2.65, 2.24, -.63], .012, "rail", crane);


crane.scale.setScalar(1.45);crane.position.set(2.1,-.36,.53);
for(const [y,h,m] of [[4.32,1.12,"stack"],[5.07,.38,"cream"],[5.49,.46,"red"],[5.83,.22,"stack"]])
  cylinder(.37,h,[-4.78,y,.61],m,"funnel");
const mastX=-2.96,mastTop=roof+4.5;
beam([mastX,roof,0],[mastX,mastTop,0],.065,"brass");
beam([mastX,7.05,-1],[mastX,7.05,1],.045,"brass");
for(const x of [-5.22,-1.6])for(const z of [-1.55,1.55])
  beam([mastX,7.69,0],[x,roof,z],.013,"rail");
for(const side of [-1,1]){
  const endX=side<0?-1.13:-5.67;
  ring(.35,.08,[endX,1.96,side*1.11],"coral").rotation.y=Math.PI/2;
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2;
    box([.16,.18,.12],[endX,1.96+.35*Math.cos(a),side*1.11+.35*Math.sin(a)],"cream",.02).rotation.x=a;
  }
}
for(const sign of [-1,1]){
  for(const px of [-6.2,-4.2,-2.2]){
    const rim=outline.reduce((best,p)=>p.z*sign>0 && Math.abs(p.x-px)<Math.abs(best.x-px)?p:best,outline[0]);
    const z=rim.z*.993;
    const lens=mesh(new THREE.CircleGeometry(.16,16),"frame",[rim.x,.84,z],"porthole");
    if(sign<0)lens.rotation.y=Math.PI;
    ring(.165,.035,[rim.x,.84,z+sign*.012],"brass");
  }
}
for(const z of [-1,1]){cylinder(.13,.39,[-8.1,1.49,z],"rail","aft-bitt");cylinder(.18,.07,[-8.1,1.71,z],"rail");}
for(const r of [.46,.38,.30,.22])ring(r,.037,[-7.1,1.35,.92],"rope").rotation.x=Math.PI/2;
const anchor=new THREE.Group();anchor.name="bow-anchor";anchor.position.set(8.05,.86,1.37);boat.add(anchor);
beam([0,.2,0],[0,-.48,0],.05,"rail",anchor);ring(.09,.025,[0,.23,0],"rail",anchor);
for(const sign of [-1,1]){
  beam([0,-.48,0],[sign*.24,-.32,0],.055,"rail",anchor);
  mesh(new THREE.ConeGeometry(.13,.27,4),"rail",[sign*.24,-.23,0],"fluke",anchor);
}
mesh(new THREE.SphereGeometry(.26,12,8),"rubber",[1.25,5.48,0],"anchor-ball");
beam([mastX,7.75,0],[7.8,2.35,0],.014,"rail");
function socket(name,at){
  const n=new THREE.Object3D();n.name=name;n.position.set(...at);boat.add(n);return n;
}
for(const [name,at] of Object.entries(sockets))socket("captain-"+name,at);
socket("captain-socket",sockets["wing-port"]).rotation.y=Math.PI/2;
socket("bow-line-fairlead",[8,1.6,-1.25]);socket("stern-line-fairlead",[-8,1.6,-1.85]);
socket("anchor-hawse",[8.05,1.12,1.37]);socket("stern",[-9.94,.04,0]);
for(const [name,at,color] of [
  ["masthead",[mastX,mastTop,0],"#fff3d5"],["port",[-2.12,3.84,-1.86],"#fa3b28"],
  ["starboard",[-2.12,3.84,1.86],"#38cb7a"],["stern",[-9.53,2.27,0],"#fff3d5"],
  ["anchor",[7.6,2.75,-.38],"#fff3d5"],
]){
  const n=socket("light-"+name,at);
  const lens=cylinder(.105,.19,[0,0,0],"cream",name+"-light",n);
  lens.material=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1.8});
}
// Combine fixed fittings within each assembly for the runtime model.
if(cityBerth){
  const assemblies=[];
  boat.traverse(n=>{if(n.isGroup)assemblies.push(n);});
  const repeating=new Set(["plank-joint","window-post","window-sill","house-trim","timber-cover","hatch-strap","side-wall","end-wall"]);
  for(const parent of assemblies){
    const groups=new Map();
    for(const part of parent.children){
      if(!part.isMesh || (part.name!==part.material.name && !repeating.has(part.name)))continue;
      const parts=groups.get(part.material)??[];
      parts.push(part);groups.set(part.material,parts);
    }
    for(const [material,parts] of groups){
      if(parts.length<2)continue;
      const allIndexed=parts.every(part=>part.geometry.index);
      const shapes=parts.map(part=>{
        part.updateMatrix();
        const g=!allIndexed && part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone();
        g.applyMatrix4(part.matrix);
        return g;
      });
      const combined=new THREE.Mesh(mergeGeometries(shapes),material);
      combined.name="fixed-"+material.name;parent.remove(...parts);parent.add(combined);
      for(const g of shapes)g.dispose();
    }
  }
}
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); });
  }
};
boat.updateMatrixWorld(true);
const glb = await new GLTFExporter().parseAsync(boat, { binary: true });
const target = new URL(cityBerth ? "../public/models/city-working-boat.glb" : "../public/models/working-boat.glb", import.meta.url);
await mkdir(new URL(".", target), { recursive: true });
await writeFile(target, new Uint8Array(glb));
console.log("Exported", target.pathname, glb.byteLength, "bytes");
