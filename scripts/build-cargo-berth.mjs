import { writeFile } from "node:fs/promises";
import * as T from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";


const colors = {
  iron: "#334849", steel: "#647b77", yellow: "#dba444", lightYellow: "#f0be60",
  slab: "#b6b0a1", edge: "#d7cbb1", rust: "#956644", white: "#e6e1cf",
  wood: "#ab8054", timber: "#cd9e69", darkWood: "#77583f", rubber: "#333a39",
  cab: "#648b88", window: "#365961", shed: "#708b87", roof: "#526d70",
  brick: "#a8644b", lamp: "#fff1c4", rear: "#b65740", stripe: "#424846",
};
const root = new T.Group();
root.name = "FishMarket";
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
// Market hall and the harbor master's office face the walking lane.
box([-1,2.75,-12],[5,5.5,6],"slab");
box([-1,5.64,-12],[5.6,.3,6.6],"roof");
for(const y of [1.4,4.0])for(const z of [-14,-12,-10])box([1.53,y,z],[.08,1.25,1.3],"window");
beam([-1,5.8,-12],[-1,9.3,-12],.08,"white");
box([-.47,8.85,-12],[1.1,.62,.04],"rust");
for(const x of [-3,1.6])for(const z of [-4,4])beam([x,0,z],[x,3.4,z],.12,"steel");
box([-.5,3.45,0],[6.8,.23,9.6],"roof",[0,0,-.06]);
box([3,3.05,0],[1.25,.11,9.6],"cab",[0,0,-.24]);
for(let i=0;i<14;i++)box([-.5+i%3*.64,.28+Math.floor(i/9)*.56,-3+Math.floor(i/3)%3*.65],[.6,.54,.6],"wood");
for(const z of [1,2.6])box([-.8,.55,z],[1.35,1.1,1.15],"white");
for(const z of [7,8,9])for(const x of [0,1])cylinder([x,.36,z],.4,.72,"darkWood",undefined,9);
beam([3.4,0,-18],[3.4,3.5,-18],.16,"yellow");
beam([3.4,3.5,-18],[6,4.15,-18],.13,"yellow");
beam([6,4.15,-18],[6,2.1,-18],.025,"iron");
box([6,2,-18],[.3,.35,.24],"yellow");
for(const z of [-23,14]){
  box([-1,1.05,z],[1.9,1.8,4.4],"white",undefined,.14);
  box([-1,1.5,z+1.88],[1.63,.6,.5],"window");
  for(const x of [-1.93,-.07])for(const dz of [-1.25,1.25])cylinder([x,.39,z+dz],.37,.2,"rubber",[0,0,Math.PI/2]);
}
quay.finish();
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result=result; this.onloadend?.(); });
  }
};
const glb = await new GLTFExporter().parseAsync(root,{binary:true});
await writeFile(new URL("../public/models/fish-market.glb",import.meta.url),new Uint8Array(glb));
console.log("Exported fish-market.glb ("+glb.byteLength+" bytes).");
