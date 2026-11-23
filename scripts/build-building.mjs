import { mkdir, writeFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

// One unit equals one metre. Positive Z is the waterfront facade.
const building = new THREE.Group();
building.name = "HealthCity harbor house";
const colors = {
  plaster: "#dfdcca", trim: "#efe4cd", inset: "#505d58",
  wood: "#ad7b48", darkWood: "#806347", rail: "#53625b",
  glassLit: "#3b5960", glassDark: "#334f56", lamp: "#e6cf9c",
  soil: "#626b49", leaf: "#7b8a4d", leafLight: "#94a35e", step: "#c5bcaa",
};
const materials = Object.fromEntries(Object.entries(colors).map(([name, color]) => [
  name, new THREE.MeshStandardMaterial({
    name, color, roughness: name.startsWith("glass") ? .29 : .78,
    metalness: name.startsWith("glass") ? .12 : name === "rail" ? .18 : 0,
  }),
]));
const geometries = new Map();
function cached(key, create) {
  if (!geometries.has(key)) geometries.set(key, create());
  return geometries.get(key);
}
function mesh(shape, material, position, rotation = [0, 0, 0]) {
  const item = new THREE.Mesh(shape, materials[material]);
  item.position.set(...position);
  item.rotation.set(...rotation);
  building.add(item);
  return item;
}
function box(size, at, material, radius = .035) {
  const corner = Math.min(radius, Math.min(...size) * .45);
  const shape = cached("box:" + size.join(",") + ":" + corner, () => new RoundedBoxGeometry(...size, 1, corner));
  return mesh(shape, material, at);
}
function roundedOutline(width, height, radius) {
  const x = -width / 2, y = -height / 2, r = Math.min(radius, width / 2, height / 2);
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}
function frame(width, height, border, depth, radius, at, material) {
  const key = ["frame", width, height, border, depth, radius].join(":");
  const shape = cached(key, () => {
    const outline = roundedOutline(width, height, radius);
    const inner = roundedOutline(width - border * 2, height - border * 2, Math.max(.04, radius - border));
    outline.holes.push(new THREE.Path(inner.getPoints(8).reverse()));
    return new THREE.ExtrudeGeometry(outline, {
      depth, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 2, curveSegments: 8,
    });
  });
  return mesh(shape, material, at);
}
function slab(width, depth, thickness, radius, at, material) {
  const key = ["slab", width, depth, thickness, radius].join(":");
  const shape = cached(key, () => {
    const result = new THREE.ExtrudeGeometry(roundedOutline(width, depth, radius), {
      depth: thickness, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 2, curveSegments: 8,
    });
    result.rotateX(-Math.PI / 2);
    result.translate(0, -thickness / 2, 0);
    return result;
  });
  return mesh(shape, material, at);
}
function beam(from, to, radius, material) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const height = a.distanceTo(b);
  const shape = cached("beam:" + radius + ":" + height, () => new THREE.CylinderGeometry(radius, radius, height, 8));
  const item = mesh(shape, material, a.clone().add(b).multiplyScalar(.5).toArray());
  item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
}
function railing(width, depth, at, radius = .28) {
  const [x, y, z] = at;
  const points = roundedOutline(width, depth, radius).getPoints(5).slice(0, -1)
    .map(point => new THREE.Vector3(point.x + x, y, -point.y + z));
  const curve = new THREE.CatmullRomCurve3(points, true, "centripetal");
  for (const height of [.4, .83]) {
    const rail = new THREE.TubeGeometry(curve, points.length * 2, height === .83 ? .026 : .017, 6, true);
    rail.translate(0, height, 0);
    mesh(rail, "rail", [0, 0, 0]);
  }
  for (const point of curve.getSpacedPoints(12).slice(0, -1)) {
    beam([point.x, y, point.z], [point.x, y + .83, point.z], .021, "rail");
  }
}
function windowPane(width, height, at, lit, rotationY = 0) {
  // The frame and pane sit behind the larger facade hood.
  const group = new THREE.Group();
  const surround = frame(width + .13, height + .13, .065, .075, .08, [0, 0, 0], "darkWood");
  const pane = box([width, height, .025], [0, 0, -.018], lit ? "glassLit" : "glassDark", .025);
  building.remove(surround, pane);
  group.add(surround, pane);
  group.position.set(...at);
  group.rotation.y = rotationY;
  building.add(group);
}
function planter(size, at) {
  box(size, at, "trim", .1);
  box([size[0] - .13, .035, size[2] - .13], [at[0], at[1] + size[1] / 2, at[2]], "soil", .02);
  for (let i = 0; i < 4; i++) {
    const x = at[0] + (i - 1.5) * (size[0] - .25) / 4;
    const shape = cached("foliage", () => new THREE.IcosahedronGeometry(1, 1));
    const shrub = mesh(shape, i % 2 ? "leaf" : "leafLight", [x, at[1] + size[1] / 2 + .14, at[2]]);
    shrub.scale.set(.24, .23 + (i % 2) * .06, Math.max(.16, size[2] * .42));
    shrub.rotation.y = i * .73;
  }
}

// Three staggered storeys and a lower wing define a single stable low-rise asset.
box([4.6, 7.75, 4.4], [-1.2, 3.875, 0], "plaster", .25);
box([3.15, 5.15, 3.7], [2.2, 2.575, .95], "plaster", .23);
box([3.86, 6.94, .055], [-1.2, 3.95, 2.235], "inset", .08);
frame(4.55, 7.5, .34, .38, .57, [-1.2, 3.95, 2.3], "trim");
box([2.5, 4.24, .055], [2.2, 2.65, 2.835], "inset", .06);
frame(3.15, 4.98, .3, .34, .5, [2.2, 2.65, 2.88], "trim");

// Deep front windows, visible mullions, and selected side windows support close inspection.
for (let floor = 0; floor < 3; floor++) {
  const y = 1.55 + floor * 2.4;
  for (let column = 0; column < 3; column++) {
    windowPane(.97, 1.85, [-2.3 + column * 1.1, y, 2.28], (column + floor) % 3 !== 1);
  }
  for (const z of [-1.3, .25, 1.55]) {
    windowPane(.92, 1.73, [-3.515, y, z], floor % 2 === 0, -Math.PI / 2);
  }
  for (const x of [-2.45, -.55]) {
    windowPane(1.14, 1.73, [x, y, -2.215], floor !== 1, Math.PI);
  }
}
for (let floor = 0; floor < 2; floor++) {
  const y = 1.45 + floor * 2.3;
  for (let column = 0; column < 2; column++) {
    windowPane(.99, 1.85, [1.61 + column * 1.18, y, 2.88], column !== floor);
  }
  for (const z of [-.15, 1.4]) {
    windowPane(.95, 1.73, [3.79, y, z], floor === 0, Math.PI / 2);
  }
}

// Rounded projecting terraces and thick floor edges preserve the G reference's massing.
for (const [width, y, z] of [[4.22, 2.77, 2.57], [3.88, 5.17, 2.61]]) {
  slab(width, 1.36, .18, .4, [-1.2, y, z], "trim");
  railing(width - .15, 1.21, [-1.2, y + .12, z], .33);
}
slab(3.35, 1.28, .18, .38, [2.2, 2.68, 3.12], "trim");
railing(3.19, 1.12, [2.2, 2.8, 3.12], .31);
slab(4.84, 4.65, .22, .4, [-1.2, 7.84, .02], "trim");
slab(3.44, 3.98, .22, .38, [2.2, 5.25, .96], "trim");
railing(3.22, 3.73, [2.2, 5.4, .96], .31);
railing(4.57, 4.39, [-1.2, 7.99, .02], .32);

// A narrow timber spine and a roof pergola add structure without surface noise.
for (let i = 0; i < 5; i++) {
  box([.045, 7.02, .11], [-3.43 + i * .074, 3.98, 2.74], "wood", .012);
}
for (let i = 0; i < 9; i++) {
  box([.055, 4.72, .105], [3.43 + i * .029, 2.62, 3.26], "wood", .01);
}
for (const x of [-2.67, .12]) {
  for (const z of [-1.15, .75]) box([.105, 1.12, .105], [x, 8.57, z], "wood", .018);
}
for (const z of [-1.15, .75]) box([3.04, .13, .13], [-1.27, 9.14, z], "wood", .018);
for (let i = 0; i < 9; i++) box([.13, .09, 2.22], [-2.63 + i * .34, 9.24, -.2], "wood", .015);

// Entrance steps, a canopy, handles, and lamps give the ground floor a usable scale.
for (let step = 0; step < 3; step++) {
  box([2.45 + step * .18, .09, .3], [2.2, .2 - step * .065, 3.22 + step * .3], "step", .03);
}
slab(2.65, .85, .12, .16, [2.2, 2.59, 3.2], "trim");
box([2.38, .05, .74], [2.2, 2.51, 3.2], "wood", .025);
for (const x of [2.11, 2.29]) {
  beam([x, 1.02, 3.01], [x, 1.3, 3.01], .018, "rail");
}
for (const x of [.73, 3.65]) {
  box([.14, .34, .15], [x, 1.9, 3.17], "rail", .03);
  box([.09, .23, .08], [x, 1.92, 3.26], "lamp", .02);
}
planter([1.03, .34, .48], [-2.42, 2.99, 2.98]);
planter([.88, .34, .48], [-.13, 5.39, 3.0]);
planter([1.39, .42, .62], [2.95, 5.6, -.28]);
planter([1.2, .4, .62], [-2.57, 8.15, 1.65]);

// Batch static geometry by material to keep facade detail inexpensive to draw.
building.updateMatrixWorld(true);
const batches = new Map();
building.traverse(item => {
  if (!(item instanceof THREE.Mesh)) return;
  const transformed = (item.geometry.index ? item.geometry.toNonIndexed() : item.geometry.clone());
  transformed.applyMatrix4(item.matrixWorld);
  if (!batches.has(item.material)) batches.set(item.material, []);
  batches.get(item.material).push(transformed);
});
const asset = new THREE.Group();
asset.name = "HealthCity harbor house";
for (const [material, shapes] of batches) {
  const combined = mergeGeometries(shapes);
  if (!combined) throw new Error("Building geometry could not be combined.");
  const item = new THREE.Mesh(mergeVertices(combined), material);
  item.name = material.name === "glassLit" ? "building-window-lit"
    : material.name === "glassDark" ? "building-window-dark"
    : material.name === "lamp" ? "building-lamps"
    : "building-" + material.name;
  asset.add(item);
}
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); });
  }
};
const glb = await new GLTFExporter().parseAsync(asset, { binary: true });
const destination = new URL("../public/models/harbor-building.glb", import.meta.url);
await mkdir(new URL(".", destination), { recursive: true });
await writeFile(destination, new Uint8Array(glb));
console.log("Exported harbor-building.glb (" + glb.byteLength + " bytes, " + batches.size + " material batches).");
