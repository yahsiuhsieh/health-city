import { mkdir, writeFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

// Five independent architectural candidates. One unit equals one metre.
// Positive Z is the entrance facade. Shape and height do not encode health data.
function model(colors) {
  const root = new THREE.Group();
  const cache = new Map();
  const materials = Object.fromEntries(Object.entries(colors).map(([name, color]) => [
    name, new THREE.MeshStandardMaterial({
      name, color, roughness: name.includes("glass") || name.includes("window") ? .27 : .78,
      metalness: name.includes("glass") || name === "metal" ? .25 : .04,
    }),
  ]));
  function shape(key, build) {
    if (!cache.has(key)) cache.set(key, build());
    return cache.get(key);
  }
  function mesh(geometry, material, at, rotation = [0, 0, 0]) {
    const item = new THREE.Mesh(geometry, materials[material]);
    item.position.set(...at);
    item.rotation.set(...rotation);
    root.add(item);
    return item;
  }
  function box(size, at, material, radius = 0) {
    const r = Math.min(radius, Math.min(...size) * .45);
    const geometry = shape("box:" + size.join(",") + ":" + r, () => r
      ? new RoundedBoxGeometry(...size, 1, r) : new THREE.BoxGeometry(...size));
    return mesh(geometry, material, at);
  }
  function cylinder(radius, height, at, material, sides = 24) {
    return mesh(shape("cylinder:" + radius + ":" + height + ":" + sides,
      () => new THREE.CylinderGeometry(radius, radius, height, sides)), material, at);
  }
  function beam(a, b, radius, material) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
    const item = cylinder(radius, from.distanceTo(to), from.clone().add(to).multiplyScalar(.5).toArray(), material, 8);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize());
    return item;
  }
  function windows({ width, depth, floors, columns, y = 2.2, step = 2.8, height = 1.9, x = 0, z = 0, inset = 0 }) {
    const pitch = width / columns;
    for (let floor = 0; floor < floors; floor++) {
      for (const side of [-1, 1]) {
        for (let column = 0; column < columns; column++) {
          const material = (floor * 7 + column * 3 + side + 1) % 5 < 2 ? "window-lit" : "window-dark";
          box([pitch * .74, height, .045],
            [x - width / 2 + pitch * (column + .5), y + floor * step, z + side * (depth / 2 + .025 - inset)], material);
        }
      }
    }
  }
  function sides({ width, depth, floors, columns, y = 2.2, step = 2.8, height = 1.9, x = 0, z = 0 }) {
    const pitch = depth / columns;
    for (let floor = 0; floor < floors; floor++) {
      for (const side of [-1, 1]) {
        for (let column = 0; column < columns; column++) {
          const material = (floor + column * 3 + side + 1) % 5 < 2 ? "window-lit" : "window-dark";
          box([.045, height, pitch * .74],
            [x + side * (width / 2 + .025), y + floor * step, z - depth / 2 + pitch * (column + .5)], material);
        }
      }
    }
  }
  function extrusion(points, depth, at, material, bevel = .02) {
    const path = new THREE.Shape();
    points.forEach(([x, y], i) => i ? path.lineTo(x, y) : path.moveTo(x, y));
    path.closePath();
    const geometry = new THREE.ExtrudeGeometry(path, {
      depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1,
    });
    geometry.translate(0, 0, -depth / 2);
    return mesh(geometry, material, at);
  }
  function pyramid(width, depth, height, at, material) {
    const geometry = new THREE.ConeGeometry(1, height, 4);
    geometry.rotateY(Math.PI / 4);
    const item = mesh(geometry, material, at);
    item.scale.set(width / Math.SQRT2, 1, depth / Math.SQRT2);
    return item;
  }
  return { root, materials, shape, mesh, box, cylinder, beam, windows, sides, extrusion, pyramid };
}

const candidates = [];
function glassSpire() {
  const m = model({
    glass: "#507f96", metal: "#57717f", trim: "#b4c5cb",
    "window-lit": "#6597aa", "window-dark": "#426a80", light: "#b9e1e8",
  });
  m.box([7.4, 2.4, 6.2], [0, 1.2, 0], "metal", .14);
  m.box([6.4, 46, 5.2], [0, 25, 0], "glass", .12);
  m.windows({ width: 6.4, depth: 5.2, floors: 16, columns: 4, y: 3.7, step: 2.8, height: 2.42 });
  m.sides({ width: 6.4, depth: 5.2, floors: 16, columns: 3, y: 3.7, step: 2.8, height: 2.42 });
  for (let floor = 0; floor <= 16; floor++) {
    m.box([6.58, .09, 5.38], [0, 2.3 + floor * 2.8, 0], "metal");
  }
  for (const x of [-3.19, -1.59, 0, 1.59, 3.19]) {
    for (const side of [-1, 1]) m.box([.055, 45.8, .16], [x, 25, side * 2.65], "trim");
  }
  for (const x of [-3.22, 3.22]) {
    for (const z of [-1.73, 0, 1.73]) m.box([.14, 45.8, .055], [x, 25, z], "trim");
  }
  m.extrusion([[-3.2, 0], [3.2, 0], [3.2, 2.7], [-3.2, 7.2]], 5.2, [0, 48, 0], "glass");
  for (const z of [-2.66, 2.66]) {
    m.beam([-3.2, 55.3, z], [3.2, 50.8, z], .07, "trim");
    m.beam([-3.2, 48, z], [-3.2, 55.3, z], .06, "trim");
    m.beam([3.2, 48, z], [3.2, 50.8, z], .06, "trim");
  }
  m.beam([-2.1, 54.5, 0], [-2.1, 60, 0], .065, "metal");
  m.cylinder(.12, .18, [-2.1, 60, 0], "light", 12);
  for (const x of [-1.65, 0, 1.65]) m.box([1.2, 1.9, .06], [x, 1.12, 3.14], "window-dark");
  return m;
}
function decoCrown() {
  const m = model({
    stone: "#d8c39f", trim: "#efe0ba", metal: "#927242", copper: "#a78348",
    "window-lit": "#496369", "window-dark": "#3d555d", light: "#e9d39d",
  });
  m.box([9.4, 5.8, 7.5], [0, 2.9, 0], "stone", .12);
  m.box([7.0, 31.4, 5.9], [0, 21.3, 0], "stone", .09);
  m.windows({ width: 7.0, depth: 5.9, floors: 11, columns: 5, y: 6.7, step: 2.8, height: 2.05 });
  m.sides({ width: 7.0, depth: 5.9, floors: 11, columns: 4, y: 6.7, step: 2.8, height: 2.05 });
  for (const x of [-3.5, -2.1, -.7, .7, 2.1, 3.5]) {
    for (const side of [-1, 1]) {
      m.box([.17, 32.3, .29], [x, 21.2, side * 3.05], "trim", .025);
      m.box([.065, 9, .34], [x, 32.8, side * 3.07], "metal");
    }
  }
  for (const [width, depth, height, y] of [[5.65, 4.9, 4.3, 38.9], [4.3, 3.9, 3.8, 42.8], [2.8, 2.8, 3.2, 46.2]]) {
    m.box([width, height, depth], [0, y, 0], "stone", .09);
    m.box([width + .33, .22, depth + .33], [0, y + height / 2, 0], "trim", .04);
    m.windows({ width, depth, floors: 1, columns: 3, y, height: height - .9 });
  }
  m.pyramid(3.2, 3.2, 3.3, [0, 49.3, 0], "copper");
  m.box([9.8, .35, 7.9], [0, 5.8, 0], "trim", .06);
  for (const side of [-1, 1]) {
    for (const x of [-3.8, -2.25, 2.25, 3.8]) {
      m.box([.25, 4.9, .32], [x, 2.8, side * 3.9], "trim", .03);
    }
  }
  m.box([2.5, 4.2, .08], [0, 2.2, 3.8], "window-dark");
  m.extrusion([[-1.55, 0], [0, .65], [1.55, 0], [1.55, -.2], [-1.55, -.2]], .26, [0, 4.5, 3.95], "metal");
  return m;
}
function concreteTerraces() {
  const m = model({
    concrete: "#9da59f", edge: "#c1c5ba", metal: "#4a5653",
    "window-lit": "#405a5d", "window-dark": "#314448", light: "#d6cba8",
  });
  m.box([9.7, 4.8, 7.3], [0, 2.4, 0], "concrete", .05);
  m.box([4.9, 36, 4.4], [0, 21.5, -.1], "concrete", .035);
  m.box([1.55, 43, 4.2], [2.7, 21.5, -.5], "edge", .035);
  for (let floor = 0; floor < 13; floor++) {
    m.box([.53, 1.8, .06], [2.68, 2.4 + floor * 3.1, 1.63], "window-dark");
  }
  for (const [x, y, z] of [[-.85, 9.7, .4], [.3, 21.1, -.15], [-.65, 32.7, .25]]) {
    for (const dy of [-3.0, 3.0]) m.box([8.9, 1.02, 6.55], [x, y + dy, z], "concrete", .04);
    for (const side of [-1, 1]) {
      m.box([1.1, 5.05, 6.5], [x + side * 3.9, y, z], "concrete", .035);
    }
    m.windows({ width: 6.5, depth: 5.0, floors: 2, columns: 4, y: y - 1.3, step: 2.6, height: 2.03, x, z });
    m.box([7.7, .16, 6.85], [x, y - 2.4, z], "edge");
    for (const side of [-1, 1]) {
      m.box([6.6, .11, .11], [x, y - .15, z + side * 3.18], "metal");
      for (const dx of [-3.1, -1.05, 1.05, 3.1]) {
        m.box([.07, .95, .08], [x + dx, y - .58, z + side * 3.18], "metal");
      }
    }
  }
  m.box([5.0, .3, 4.8], [0, 40.5, -.15], "edge", .025);
  for (let i = 0; i < 6; i++) m.box([.19, 1.4, 2.4], [-1.4 + i * .5, 41.3, -.3], "concrete");
  m.box([4.1, 3.2, .05], [-.6, 1.75, 3.69], "window-dark");
  return m;
}
function ribbonTower() {
  const m = model({
    glass: "#4e817e", white: "#e8ece4", metal: "#9bb4ae",
    "window-lit": "#6b9f97", "window-dark": "#3e696b", light: "#d4e1c7",
  });
  const core = m.cylinder(2.77, 49.5, [0, 25.1, 0], "glass", 48);
  core.scale.z = .81;
  const podium = m.cylinder(4.3, 2.4, [0, 1.2, 0], "white", 48);
  podium.scale.z = .8;
  for (let floor = 0; floor < 17; floor++) {
    const y = 2.7 + floor * 2.85;
    const plate = m.cylinder(3.65 - floor * .013, .19, [0, y, 0], "white", 48);
    plate.scale.z = .77;
    plate.rotation.y = floor * .045;
    for (let sector = 0; sector < 8; sector++) {
      const key = "curved-pane:" + sector;
      const pane = m.shape(key, () => new THREE.CylinderGeometry(
        2.8, 2.8, 2.3, 8, 1, true, sector * Math.PI / 4 + .045, Math.PI / 4 - .09,
      ));
      const item = m.mesh(pane, (sector + floor * 3) % 5 < 2 ? "window-lit" : "window-dark", [0, y + 1.35, 0]);
      item.scale.z = .81;
    }
  }
  for (let ribbon = 0; ribbon < 3; ribbon++) {
    const points = [];
    for (let i = 0; i <= 48; i++) {
      const y = 1 + i * 1.08;
      const angle = ribbon * Math.PI * 2 / 3 + y * .024;
      points.push(new THREE.Vector3(Math.cos(angle) * 3.52, y, Math.sin(angle) * 2.85));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    m.mesh(new THREE.TubeGeometry(curve, 96, .145, 8), "white", [0, 0, 0]);
  }
  const roof = m.cylinder(3.54, .5, [0, 51.7, 0], "white", 48);
  roof.scale.z = .77;
  roof.rotation.y = .77;
  const roofLantern = m.cylinder(1.9, .7, [0, 52.25, 0], "light", 48);
  roofLantern.scale.z = .77;
  return m;
}
function brickCrown() {
  const m = model({
    brick: "#a45f48", stone: "#e3ceb0", darkStone: "#ad9a7c", metal: "#5b665e",
    copper: "#548a78", "window-lit": "#3f5e60", "window-dark": "#33474c", light: "#dfc99a",
  });
  function arch(width, height) {
    const shape = new THREE.Shape();
    const r = width / 2;
    shape.moveTo(-r, -height / 2);
    shape.lineTo(-r, height / 2 - r);
    shape.quadraticCurveTo(-r, height / 2, 0, height / 2);
    shape.quadraticCurveTo(r, height / 2, r, height / 2 - r);
    shape.lineTo(r, -height / 2);
    shape.closePath();
    return shape;
  }
  const frame = arch(1.1, 2.05);
  frame.holes.push(new THREE.Path(arch(.84, 1.78).getPoints(6).reverse()));
  const surround = new THREE.ExtrudeGeometry(frame, { depth: .13, bevelEnabled: false, curveSegments: 6 });
  const pane = new THREE.ShapeGeometry(arch(.84, 1.78), 6);
  m.box([8.3, 4.9, 6.9], [0, 2.45, 0], "brick", .08);
  m.box([7.3, 32.4, 6.0], [0, 20.7, 0], "brick", .07);
  for (let floor = 0; floor < 12; floor++) {
    const y = 5.6 + floor * 2.65;
    for (const side of [-1, 1]) {
      for (let column = 0; column < 4; column++) {
        const x = (column - 1.5) * 1.65;
        const rotation = side < 0 ? [0, Math.PI, 0] : [0, 0, 0];
        m.mesh(surround, "stone", [x, y, side * 3.04], rotation);
        m.mesh(pane, (column + floor * 2) % 5 < 2 ? "window-lit" : "window-dark", [x, y, side * 3.065], rotation);
      }
    }
    m.box([7.55, .15, 6.25], [0, y - 1.15, 0], "stone");
  }
  m.sides({ width: 7.3, depth: 6, floors: 12, columns: 3, y: 5.6, step: 2.65, height: 1.9 });
  for (const x of [-3.68, 3.68]) {
    for (const z of [-3.02, 3.02]) m.box([.22, 32.8, .24], [x, 20.7, z], "stone", .025);
  }
  for (const [width, depth, y] of [[7.7, 6.4, 36.9], [8.0, 6.7, 37.2], [8.35, 7.0, 37.5]]) {
    m.box([width, .2, depth], [0, y, 0], "stone", .04);
  }
  m.box([5.2, 5.4, 4.6], [0, 40.3, 0], "brick", .06);
  m.windows({ width: 5.2, depth: 4.6, floors: 2, columns: 3, y: 39.0, step: 2.5, height: 1.8 });
  m.box([5.7, .22, 5.1], [0, 43.1, 0], "stone", .035);
  m.pyramid(6.1, 5.5, 5.4, [0, 45.8, 0], "copper");
  m.beam([0, 48.5, 0], [0, 50.0, 0], .045, "metal");
  for (const x of [-2.7, 0, 2.7]) {
    m.box([1.45, 3.55, .07], [x, 2.0, 3.5], "window-dark");
    m.box([1.68, .18, .24], [x, 3.9, 3.57], "stone");
  }
  return m;
}

candidates.push(["glass", glassSpire], ["deco", decoCrown], ["concrete", concreteTerraces], ["ribbon", ribbonTower], ["brick", brickCrown]);
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); });
  }
};
for (const [id, build] of candidates) {
  const source = build();
  const horizontalScale = { glass: 1.75, deco: 1.4, concrete: 1.4, ribbon: 1.6, brick: 1.6 }[id];
  source.root.scale.set(horizontalScale, 1, horizontalScale);
  source.root.updateMatrixWorld(true);
  const batches = new Map();
  source.root.traverse(item => {
    if (!(item instanceof THREE.Mesh)) return;
    const shape = item.geometry.index ? item.geometry.toNonIndexed() : item.geometry.clone();
    shape.applyMatrix4(item.matrixWorld);
    if (!batches.has(item.material)) batches.set(item.material, []);
    batches.get(item.material).push(shape);
  });
  const asset = new THREE.Group();
  asset.name = "HealthCity " + id + " tower";
  let triangles = 0;
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries);
    if (!merged) throw new Error("Tower geometry could not be combined.");
    const shape = mergeVertices(merged);
    triangles += shape.index.count / 3;
    const mesh = new THREE.Mesh(shape, material);
    mesh.name = material.name === "window-lit" ? "tower-window-lit"
      : material.name === "window-dark" ? "tower-window-dark"
      : "tower-" + material.name;
    asset.add(mesh);
  }
  const glb = await new GLTFExporter().parseAsync(asset, { binary: true });
  const destination = new URL("../public/models/tower-" + id + ".glb", import.meta.url);
  await mkdir(new URL(".", destination), {recursive:true});
  await writeFile(destination, new Uint8Array(glb));
  console.log(id + ": " + glb.byteLength + " bytes, " + batches.size + " batches, " + triangles + " triangles.");
}
