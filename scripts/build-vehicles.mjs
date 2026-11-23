import { writeFile } from "node:fs/promises";
import {
  CylinderGeometry, DoubleSide, ExtrudeGeometry, Float32BufferAttribute, BufferGeometry, FrontSide,
  Group, Mesh, MeshStandardMaterial, Shape,
} from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const designs = [
  { id: "van", color: "#e6dcbb", width: 1.94, length: 4.62, top: 2.19, roofRear: -1.95, roofFront: .97, cabRear: -2.15, cabFront: 1.83, sill: 1.11, accent: "#42685f" },
  { id: "saloon", color: "#a84d40", width: 1.75, length: 4.12, top: 1.48, roofRear: -.70, roofFront: .53, cabRear: -1.48, cabFront: 1.25, sill: .89, accent: "#e2d0af" },
  { id: "hatchback", color: "#639a8d", width: 1.66, length: 3.48, top: 1.62, roofRear: -1.23, roofFront: .46, cabRear: -1.59, cabFront: 1.11, sill: .91, accent: "#345650" },
  { id: "pickup", color: "#c89545", width: 1.91, length: 4.66, top: 1.94, roofRear: -.25, roofFront: .72, cabRear: -.52, cabFront: 1.39, sill: 1.04, accent: "#704c30" },
];

function vehicle(design) {
  const { id, width, length, sill, top, cabRear, cabFront, roofRear, roofFront } = design;
  const result = new Group();
  result.name = "Harbor vehicle " + id;
  const materials = Object.fromEntries(Object.entries({
    paint: design.color, accent: design.accent, rubber: "#303532", grille: "#353d3b", spokes: "#58605c",
    trim: "#a6aaa0", glass: "#35545a", hub: "#d4c9ac",
    headlight: "#f6e4b5", taillight: "#9d3d30", plate: "#f1e4c9",
  }).map(([name, color]) => [name, new MeshStandardMaterial({
    color, name, side: name === "glass" ? DoubleSide : FrontSide,
    roughness: name === "glass" ? .24 : .68,
  })]));

  function mesh(geometry, material, position = [0, 0, 0], parent = result) {
    const part = new Mesh(geometry, materials[material]);
    part.position.set(...position);
    parent.add(part);
    return part;
  }

  function box(size, radius, material, position, parent) {
    return mesh(new RoundedBoxGeometry(...size, 1, radius), material, position, parent);
  }

  const nose = length / 2;
  const widthAtRoof = width - .22;
  box([width, sill - .41, length], .135, "paint", [0, (sill + .41) / 2, 0]);
  box([width * .94, .21, length - .13], .075, "grille", [0, .47, 0]);

  // Model the side profile in the YZ plane. Positive Z is the front.
  const profile = new Shape();
  profile.moveTo(cabRear, sill - .025);
  profile.lineTo(cabFront, sill - .025);
  profile.lineTo(roofFront, top);
  profile.lineTo(roofRear, top);
  profile.closePath();
  const cabin = new ExtrudeGeometry(profile, { depth: widthAtRoof - .06, bevelEnabled: true,
    bevelSize: .04, bevelThickness: .03, bevelSegments: 1, steps: 1, curveSegments: 1 });
  cabin.rotateY(-Math.PI / 2);
  mesh(cabin, "paint", [(widthAtRoof - .06) / 2, 0, 0]);
  box([widthAtRoof, .105, roofFront - roofRear + .08], .049, "paint", [0, top - .007, (roofFront + roofRear) / 2]);

  function glass(points) {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(points.flat(), 3));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals();
    mesh(geometry, "glass");
  }

  const tireGeometry = new CylinderGeometry(.34, .34, .225, 18);
  const hubGeometry = new CylinderGeometry(.218, .218, .029, 14);
  const spokeGeometry = new RoundedBoxGeometry(.025, .148, .052, 1, .014);
  for (const side of [-1, 1]) {
    const upperY = top - .145;
    const lowerY = sill + .13;
    const x = side * (widthAtRoof / 2 + .009);
    const rear = roofRear + .15;
    const front = roofFront - .075;
    const frontBottom = cabFront + (roofFront - cabFront) * ((lowerY - sill) / (top - sill)) - .105;
    const rearBottom = cabRear + (roofRear - cabRear) * ((lowerY - sill) / (top - sill)) + .10;
    const pillar = id === "van" ? .30 : (front + rear) / 2;
    if (id !== "pickup" && id !== "van") {
      glass([[x, lowerY, rearBottom], [x, lowerY, pillar - .065], [x, upperY, pillar - .065], [x, upperY, rear]]);
    }
    glass([[x, lowerY, id === "pickup" ? rearBottom : pillar + .065], [x, lowerY, frontBottom],
      [x, upperY, front], [x, upperY, id === "pickup" ? rear : pillar + .065]]);
    box([.041, .057, .22], .016, "trim", [side * (width / 2), sill - .076, pillar + .22]);
    box([.13, .099, .17], .032, "grille", [side * (widthAtRoof / 2 + .093), lowerY + .095, frontBottom + .05]);
    box([.08, .065, length * .73], .017, "accent", [side * (width / 2 - .013), sill - .23, 0]);
    const lampShape = id === "saloon" ? [.26, .22, .09] : [.37, .17, .09];
    box(lampShape, .073, "headlight", [side * width * .32, sill - .145, nose + .018]);
    box([.28, .16, .08], .048, "taillight", [side * width * .34, sill - .11, -nose - .012]);
    for (const axle of [-1, 1]) {
      const wheel = new Group();
      wheel.name = "wheel-" + side + "-" + axle;
      wheel.position.set(side * width * .47, .34, axle * length * .303);
      result.add(wheel);
      mesh(tireGeometry, "rubber", [0, 0, 0], wheel).rotation.z = Math.PI / 2;
      mesh(hubGeometry, "hub", [side * .12, 0, 0], wheel).rotation.z = Math.PI / 2;
      for (let spoke = 0; spoke < 5; spoke++) {
        const angle = spoke * 2 * Math.PI / 5;
        mesh(spokeGeometry, "spokes",
          [side * .14, Math.cos(angle) * .12, Math.sin(angle) * .12], wheel).rotation.x = angle;
      }
    }
  }

  function endWindow(sillZ, roofZ, lower, upper, span) {
    const at = fraction => sillZ + (roofZ - sillZ) * fraction + Math.sign(sillZ - roofZ) * .046;
    glass([[-span, sill + (top - sill) * lower, at(lower)], [span, sill + (top - sill) * lower, at(lower)],
      [span, sill + (top - sill) * upper, at(upper)], [-span, sill + (top - sill) * upper, at(upper)]]);
  }
  endWindow(cabFront, roofFront, .16, .82, widthAtRoof * .423);
  if (id !== "van") endWindow(cabRear, roofRear, .2, .8, widthAtRoof * .412);
  box([width * .38, .146, .073], .039, "grille", [0, sill - .17, nose + .022]);
  box([.37, .126, .05], .022, "plate", [0, .54, -nose - .055]);
  for (const side of [-1, 1]) {
    box([width * .96, .12, .14], .04, "trim", [0, .48, side * nose]);
    if (id === "pickup") {
      const bedLength = nose + cabRear - .05;
      box([.13, .28, bedLength], .046, "paint", [side * (width / 2 - .075), sill + .096, cabRear - bedLength / 2]);
    }
  }
  if (id === "pickup") {
    box([width * .85, .27, .13], .045, "paint", [0, sill + .088, -nose + .06]);
    box([width * .82, .044, nose + cabRear - .1], .014, "accent", [0, sill + .006, (cabRear - nose) / 2]);
  }
  if (id === "van") {
    box([width * .77, .67, .057], .077, "accent", [0, 1.45, cabRear + .013]);
    box([.042, .65, .059], .014, "paint", [0, 1.45, cabRear - .022]);
  }
  return result;
}

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); });
  }
};

for (const design of designs) {
  const glb = await new GLTFExporter().parseAsync(vehicle(design), { binary: true });
  const name = "vehicle-" + design.id + ".glb";
  await writeFile(new URL("../public/models/" + name, import.meta.url), new Uint8Array(glb));
  console.log("Exported " + name + " (" + glb.byteLength + " bytes).");
}
