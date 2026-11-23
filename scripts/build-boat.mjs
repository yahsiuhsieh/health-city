import { mkdir, writeFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// Editable source for the representative cargo boat. One unit equals one metre.
// The bow points along positive X. The browser loads the exported GLB.
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
  return mesh(geometry(key, () => new RoundedBoxGeometry(...size, 2, corner)), material, at, name, parent);
}
function cylinder(radius, height, at, material, name = "", parent = boat) {
  const key = "cylinder:" + radius + ":" + height;
  return mesh(geometry(key, () => new THREE.CylinderGeometry(radius, radius, height, 16)), material, at, name, parent);
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
  return mesh(new THREE.TubeGeometry(curve, Math.max(12, points.length * 3), radius, 6, closed), material, [0, 0, 0], "", parent);
}
function ring(radius, thickness, at, material, parent = boat) {
  const key = "ring:" + radius + ":" + thickness;
  return mesh(geometry(key, () => new THREE.TorusGeometry(radius, thickness, 8, 20)), material, at, "", parent);
}

const controls = [[4.7, 0], [4.25, .75], [3.1, 1.24], [1.6, 1.43], [-2.75, 1.43],
  [-3.65, 1.18], [-4.02, .63], [-4.02, -.63], [-3.65, -1.18], [-2.75, -1.43],
  [1.6, -1.43], [3.1, -1.24], [4.25, -.75]];
const outlineCurve = new THREE.CatmullRomCurve3(controls.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "centripetal");
const outline = outlineCurve.getPoints(64).slice(0, -1);
const sheer = x => 1.14 + Math.pow(Math.max(0, x - 1.5) / 3.2, 1.7) * .23
  + Math.pow(Math.max(0, -x - 2.7) / 1.5, 2) * .08;

// Rounded waterline and a raised bow preserve the cargo vessel's silhouette.
const vertices = [], indices = [], plateColors = [];
const rings = [
  { scale: .73, y: -.65, color: "#624138" },
  { scale: .94, y: .03, color: "#803e32" },
  { scale: .985, y: .62, color: "#a24a37" },
  { scale: 1, y: null, color: "#ad5540" },
];
for (const [row, band] of rings.entries()) {
  for (const [i, point] of outline.entries()) {
    vertices.push(point.x * band.scale, band.y ?? sheer(point.x), point.z * band.scale);
    const color = new THREE.Color(band.color).multiplyScalar(.98 + Math.sin(i * 1.7 + row * 2.1) * .035);
    plateColors.push(color.r, color.g, color.b);
  }
}
const count = outline.length;
for (let row = 0; row < rings.length - 1; row++) {
  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    const a = row * count + i, b = row * count + next;
    indices.push(a, a + count, b, b, a + count, b + count);
  }
}
const hull = new THREE.BufferGeometry();
hull.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
hull.setAttribute("color", new THREE.Float32BufferAttribute(plateColors, 3));
hull.setIndex(indices);
hull.computeVertexNormals();
mesh(hull, "hull", [0, 0, 0], "cargo-hull");
for (const y of [.44, .81]) {
  pathTube(outline.map(point => {
    const scale = y < .62 ? THREE.MathUtils.lerp(.94, .985, (y - .03) / .59)
      : THREE.MathUtils.lerp(.985, 1, (y - .62) / (sheer(point.x) - .62));
    return [point.x * scale * 1.001, y, point.z * scale * 1.001];
  }), .007, "plateSeam", true);
}

const deckShape = new THREE.Shape();
outline.forEach((point, i) => i ? deckShape.lineTo(point.x * .97, -point.z * .97) : deckShape.moveTo(point.x * .97, -point.z * .97));
deckShape.closePath();
const deckGeometry = new THREE.ExtrudeGeometry(deckShape, {
  depth: .08, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 2,
});
deckGeometry.rotateX(-Math.PI / 2);
mesh(deckGeometry, "deck", [0, 1.02, 0], "open-cargo-deck");
for (const z of [-1.1, -.88, -.66, -.44, -.22, 0, .22, .44, .66, .88, 1.1]) {
  box([5.65, .006, .008], [-.1, 1.106, z], "seam", .002);
}
pathTube(outline.map(p => [p.x, sheer(p.x) + .015, p.z]), .055, "cream", true);
pathTube(outline.map(p => [p.x * .997, sheer(p.x) - .1, p.z * .997]), .024, "cream", true);
const boardingGate = p => p.z > 0 && Math.abs(p.x - .6) < .68;
const gateIndex = outline.findIndex(boardingGate);
const railOutline = [...outline.slice(gateIndex), ...outline.slice(0,gateIndex)].filter(p=>!boardingGate(p));
for (const height of [.34, .65]) {
  pathTube(railOutline.map(p => [p.x * .985, sheer(p.x) + height, p.z * .985]), .025, "rail");
}
for (let i = 0; i < count; i += 4) {
  const p = outline[i];
  if (boardingGate(p)) continue;
  beam([p.x * .985, sheer(p.x), p.z * .985], [p.x * .985, sheer(p.x) + .65, p.z * .985], .028, "rail");
}

// The compact aft house leaves most of the deck available for cargo.
box([2.7, 1.38, 2.38], [-2.43, 1.82, 0], "cream", .13, "aft-house");
box([2.96, .16, 2.65], [-2.43, 2.55, 0], "cream", .09);
box([1.94, 1.24, 1.98], [-1.98, 3.25, 0], "cream", .12, "wheelhouse");
box([2.23, .16, 2.27], [-1.98, 3.94, 0], "cream", .08);

for (const side of [-1, 1]) {
  for (const x of [-2.54, -1.79]) {
    box([.62, .82, .055], [x, 3.28, side * 1.005], "frame", .07);
    box([.49, .69, .03], [x, 3.28, side * 1.045], "glass", .045, "cabin-window");
  }
  for (const x of [-3.3, -2.4, -1.5]) {
    box([.56, .62, .055], [x, 1.95, side * 1.195], "frame", .065);
    box([.43, .49, .025], [x, 1.95, side * 1.235], "glass", .045, "cabin-window");
  }
  box([.54, .96, .06], [-1.47, 1.65, side * 1.205], "frame", .06);
  box([.42, .83, .03], [-1.47, 1.65, side * 1.245], "deck", .045);
  cylinder(.035, .12, [-1.36, 1.7, side * 1.28], "brass").rotation.x = Math.PI / 2;
}
for (const z of [-.64, 0, .64]) {
  box([.06, .82, .54], [-.995, 3.28, z], "frame", .06);
  box([.03, .68, .41], [-.955, 3.28, z], "glass", .04, "cabin-window");
}
for (const z of [-.5, .5]) {
  box([.06, .76, .6], [-2.975, 3.28, z], "frame", .06);
  box([.03, .63, .47], [-3.015, 3.28, z], "glass", .04, "cabin-window");
}

box([.94,.13,1.38], [-.68,2.575,-.39], "deck", .04, "bridge-wing");
beam([-.25,2.64,-1.06],[-.25,3.3,-1.06],.03,"rail");
beam([-.25,3.3,-1.06],[-1.05,3.3,-1.06],.032,"rail");

// Upper deck rails and a short stair connect the two working levels.
const upperRail = [[-3.82, 0, -1.22], [-.96, 0, -1.22], [-.96, 0, 1.22], [-3.82, 0, 1.22]];
for (let i = 0; i < upperRail.length; i++) {
  const a = upperRail[i], b = upperRail[(i + 1) % upperRail.length];
  for (const y of [2.87, 3.18]) beam([a[0], y, a[2]], [b[0], y, b[2]], .024, "rail");
  for (let step = 0; step < 4; step++) {
    const x = THREE.MathUtils.lerp(a[0], b[0], step / 4);
    const z = THREE.MathUtils.lerp(a[2], b[2], step / 4);
    beam([x, 2.64, z], [x, 3.18, z], .025, "rail");
  }
}
for (let i = 0; i < 7; i++) {
  box([.21, .07, .55], [-.35 - i * .14, 1.18 + i * .21, -.99], "deck", .025);
}
for (const z of [-.66, -1.32]) {
  beam([-.24, 1.26, z], [-1.34, 2.84, z], .025, "rail");
}

// Large hatch covers, timber framing, and a few handles establish the open hold.
const hatches = new THREE.Group();
hatches.name = "cargo-hatches";
boat.add(hatches);
for (const x of [-.02, 1.42]) {
  box([1.32, .28, 1.7], [x, 1.26, .12], "seam", .04, "", hatches);
  box([1.36, .09, 1.76], [x, 1.43, .12], "hatch", .03, "", hatches);
  for (const offset of [-.49, -.24, 0, .24, .49]) {
    box([.008, .008, 1.67], [x + offset, 1.479, .12], "seam", .002, "", hatches);
  }
  for (const offset of [-.43, .43]) {
    box([.055, .017, 1.7], [x + offset, 1.49, .12], "frame", .006, "", hatches);
  }
  for (const z of [-.55, .8]) {
    beam([x - .13, 1.51, z], [x + .13, 1.51, z], .018, "rail", hatches);
  }
}

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

// A banded stack, rigged mast, and lamps complete the aft silhouette.
cylinder(.27, 1.14, [-3.32, 3.23, .35], "stack");
cylinder(.27, .24, [-3.32, 3.92, .35], "red");
cylinder(.27, .24, [-3.32, 4.16, .35], "cream");
cylinder(.27, .24, [-3.32, 4.4, .35], "stack");
cylinder(.3, .1, [-3.32, 4.57, .35], "rail");
beam([-2.06, 4.04, .1], [-2.06, 5.36, .1], .034, "brass");
beam([-2.58, 4.94, .1], [-1.54, 4.94, .1], .025, "brass");
for (const [x, z] of [[-2.92, -.82], [-1.08, -.82], [-2.92, .82], [-1.08, .82]]) {
  beam([-2.06, 5.12, .1], [x, 4.04, z], .008, "rail");
}
cylinder(.09, .16, [-2.06, 5.34, .1], "cream", "mast-lamp");
cylinder(.12, .1, [-2.06, 5.46, .1], "rail");
const searchlight = cylinder(.13, .19, [-1.16, 4.16, -.65], "brass");
searchlight.rotation.z = Math.PI / 2;
const lens = cylinder(.1, .02, [-1.05, 4.16, -.65], "cream", "mast-lamp");
lens.rotation.z = Math.PI / 2;
for (const side of [-1, 1]) {
  const light = box([.16, .12, .16], [-1.22, 4.08, side * 1.01], "coral", .035, "navigation-lamp");
  light.material = new THREE.MeshStandardMaterial({
    color: side < 0 ? "#bc5947" : "#79a98c", roughness: .5,
    emissive: side < 0 ? "#dc624b" : "#70bc92", emissiveIntensity: .1,
  });
}

// Life rings, aft portholes, anchors, mooring equipment, and sparse rope coils.
for (const side of [-1, 1]) {
  ring(.29, .075, [-1.66, 2.09, side * 1.28], "coral");
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const patch = box([.12, .15, .08], [-1.66 + Math.sin(angle) * .29, 2.09 + Math.cos(angle) * .29, side * 1.29], "cream", .02);
    patch.rotation.z = -angle;
  }
  for (const x of [-3.35, -2.48, -1.55]) {
    ring(.105, .025, [x, .77, side * 1.39], "brass");
    const glass = mesh(geometry("porthole", () => new THREE.CircleGeometry(.09, 16)), "glass", [x, .77, side * 1.392]);
    if (side < 0) glass.rotation.y = Math.PI;
  }
  ring(.09, .03, [4.05, .95, side * .93], "rail");
  beam([4.05, .87, side * .93], [4.05, .36, side * .93], .034, "rail");
  pathTube([[3.82, .57, side * .93], [3.88, .4, side * .93], [4.05, .33, side * .93],
    [4.22, .4, side * .93], [4.28, .57, side * .93]], .032, "rail");
}
for (const x of [-3.65, 3.8]) {
  cylinder(.085, .24, [x, 1.29, 0], "rail");
  beam([x, 1.4, -.21], [x, 1.4, .21], .05, "rail");
}
for (const radius of [.18, .135, .09]) {
  ring(radius, .018, [3.5, 1.13, .55], "rope").rotation.x = Math.PI / 2;
}

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); });
  }
};
boat.updateMatrixWorld(true);
const glb = await new GLTFExporter().parseAsync(boat, { binary: true });
const target = new URL("../public/models/working-boat.glb", import.meta.url);
await mkdir(new URL(".", target), { recursive: true });
await writeFile(target, new Uint8Array(glb));
console.log("Exported working-boat.glb (" + glb.byteLength + " bytes).");
