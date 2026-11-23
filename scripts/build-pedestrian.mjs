import { writeFile } from "node:fs/promises";
import { CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const baseColors = {
  jacket: "#ab5941",
  trousers: "#364b50",
  shoes: "#463b34",
  skin: "#bd8863",
  hair: "#382e2a",
  collar: "#e1d2b7",
  seams: "#634d3c",
  accessory: "#d6ae68",
};

function part(parent, name, position) {
  const group = new Group();
  group.name = name;
  group.position.set(...position);
  parent.add(group);
  return group;
}

function createPedestrian(style, colors) {
  const figure = new Group();
  figure.name = "Harbor pedestrian " + style;
  const child = style === "child";
  const shopper = style === "shopper";
  const coatWalker = style === "promenade" || shopper;
  if (shopper) figure.scale.set(.96, .94, .96);
  const narrowCoat = coatWalker || style === "commuter";
  if (child) figure.scale.set(.74, .69, .75);
  const materials = Object.fromEntries(Object.entries({ ...baseColors, ...colors })
    .map(([name, color]) => [name, new MeshStandardMaterial({ name, color, roughness: .84 })]));

  function shape(parent, geometry, material, position) {
    const item = new Mesh(geometry, materials[material]);
    item.position.set(...position);
    parent.add(item);
    return item;
  }

  function box(parent, size, corner, material, position) {
    return shape(parent, new RoundedBoxGeometry(...size, 1, corner), material, position);
  }

  function oval(parent, size, material, position, topOnly = false) {
    const geometry = new SphereGeometry(1, 10, 8, 0, 2 * Math.PI, 0, topOnly ? Math.PI * .62 : Math.PI);
    geometry.scale(...size);
    return shape(parent, geometry, material, position);
  }

  // Metres, with the soles at Y = 0 and the face toward positive Z.
  const hips = box(figure, [.31, .2, .22], .055, "trousers", [0, .879, 0]);
  box(figure, [narrowCoat ? .357 : .394, .465, .24], .079, "jacket", [0, 1.156, .006]);
  box(figure, [.012, .34, .021], .005, "seams", [0, 1.146, .126]);
  box(figure, [.198, .105, .184], .035, "collar", [0, 1.39, .014]);
  oval(figure, [.073, .09, .066], "skin", [0, 1.444, .01]);
  const head = part(figure, "head", [0, 1.602, 0]);
  if (child) head.scale.setScalar(1.23);
  oval(head, [.116, .143, .111], "skin", [0, 0, .015]);
  oval(head, [.122, .149, .105], "hair", [0, .026, -.013], true);
  oval(head, [.031, .038, .025], "skin", [0, -.012, .12]);
  for (const side of [-1, 1]) {
    oval(head, [.024, .036, .025], "skin", [side * .105, -.016, .009]);
    oval(head, [.009, .007, .006], "seams", [side * .041, .02, .115]);
    box(figure, [.106, .026, .015], .008, "seams", [side * .107, 1.045, .126]);

    const label = side < 0 ? "left" : "right";
    const thigh = part(figure, label + "-thigh", [side * .086, .87, 0]);
    box(thigh, [.145, .407, .164], .044, "trousers", [0, -.19, 0]);
    const knee = part(thigh, label + "-knee", [0, -.382, 0]);
    box(knee, [.128, .385, .139], .04, "trousers", [0, -.178, 0]);
    const ankle = part(knee, label + "-ankle", [0, -.378, 0]);
    box(ankle, [.139, .11, .249], .039, "shoes", [0, -.055, .038]);

    const shoulder = part(figure, label + "-shoulder", [side * (narrowCoat ? .181 : .203), 1.338, .007]);
    const upperArm = box(shoulder, [.135, .288, .152], .054, "jacket", [side * .025, -.092, 0]);
    upperArm.rotation.z = side * .1;
    const elbow = part(shoulder, label + "-elbow", [side * .042, -.214, .002]);
    box(elbow, [.105, .235, .123], .037, "jacket", [0, -.104, 0]);
    oval(elbow, [.045, .063, .043], "skin", [0, -.229, .003]);
  }

  if (style === "commuter") {
    oval(head, [.124, .174, .095], "hair", [0, -.02, -.051]);
    for (const side of [-1, 1]) {
      oval(head, [.043, .119, .076], "hair", [side * .093, -.045, -.005]);
    }
    box(figure, [.367, .186, .244], .044, "jacket", [0, .948, .004]);
    box(figure, [.19, .189, .116], .028, "accessory", [-.206, .938, .119]);
    box(figure, [.027, .51, .027], .009, "accessory", [0, 1.174, .143]).rotation.z = -.65;
  } else if (coatWalker) {
    const skirt = new CylinderGeometry(.155, .215, .384, 12);
    skirt.scale(1, 1, .77);
    shape(figure, skirt, "trousers", [0, .806, .005]).name = "skirt";
    oval(head, [.076, .085, .067], "hair", [0, .015, -.11]);
    oval(head, [.049, .032, .043], "accessory", [0, -.012, -.157]);
    if (shopper) {
      const hand = figure.getObjectByName("right-elbow");
      box(hand, [.22, .23, .18], .035, "accessory", [.047, -.46, .025]).name = "market-bag";
      for (const z of [-.035, .075]) box(hand, [.025,.14,.022], .008, "seams", [.035,-.315,z]);
      oval(hand,[.052,.09,.036],"collar",[.075,-.334,.031]);
    } else oval(head, [.061, .139, .054], "hair", [0, -.118, -.177]).rotation.x = .33;
    box(figure, [.142, .07, .045], .016, "collar", [.023, 1.318, .121]);
  } else if (child) {
    oval(head, [.137, .076, .135], "jacket", [0, .105, .008], true);
    oval(head, [.15, .027, .083], "jacket", [0, .092, .081]);
    box(figure, [.26, .365, .185], .061, "accessory", [0, 1.176, -.172]);
    box(figure, [.169, .096, .055], .022, "collar", [0, 1.104, -.258]);
    for (const side of [-1, 1]) {
      box(figure, [.033, .32, .032], .01, "accessory", [side * .129, 1.181, .127]);
    }
  } else if (style === "hiker") {
    box(figure, [.242, .337, .189], .058, "accessory", [0, 1.195, -.176]);
    box(figure, [.204, .123, .062], .024, "seams", [0, 1.105, -.264]);
    for (const side of [-1, 1]) {
      box(figure, [.028, .35, .03], .01, "seams", [side * .128, 1.197, .128]);
    }
    oval(figure, [.129, .089, .114], "jacket", [0, 1.691, -.002], true);
    box(figure, [.151, .022, .123], .01, "jacket", [0, 1.682, .092]);
  } else if (style === "crew") {
    oval(figure, [.138, .097, .124], "accessory", [0, 1.687, .012], true);
    oval(figure, [.149, .019, .139], "accessory", [0, 1.667, .025]);
    box(figure, [.41, .043, .246], .012, "collar", [0, 1.051, .008]);
    box(figure, [.41, .043, .246], .012, "collar", [0, 1.124, .008]);
  } else {
    oval(figure, [.122, .083, .119], "seams", [0, 1.696, .014], true);
    box(figure, [.224, .039, .202], .018, "seams", [0, 1.68, .015]);
  }
  const torso = part(figure, "upper-body", [0, .98, 0]);
  for (const item of [...figure.children]) {
    if (item === torso || item === hips || item.name === "skirt" || item.name.endsWith("-thigh")) continue;
    torso.add(item);
    item.position.y -= torso.position.y;
  }
  return figure;
}

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); });
  }
};

for (const [file, style, colors] of [
  ["harbor-pedestrian", "dock coat", {}],
  ["pedestrian-commuter", "commuter", { jacket: "#5e587c", trousers: "#4d4a45", accessory: "#bd8c58", skin: "#b57655" }],
  ["pedestrian-hiker", "hiker", { jacket: "#427e72", trousers: "#817259", accessory: "#d4a13e", skin: "#d5a27d" }],
  ["pedestrian-crew", "crew", { jacket: "#d39831", trousers: "#39495b", accessory: "#e5ac38", skin: "#84523d" }],
  ["pedestrian-promenade", "promenade", { jacket: "#d89671", trousers: "#355f65", accessory: "#d5ab62", hair: "#392c29", skin: "#d0a17d" }],
  ["pedestrian-shopper", "shopper", { jacket:"#697e80", trousers:"#594d65", hair:"#d5d2c6", accessory:"#b18750", skin:"#c89370" }],
  ["pedestrian-child", "child", { jacket: "#4a7fba", trousers: "#776046", shoes: "#bc6743", accessory: "#ca9653", hair: "#533b30", skin: "#cea278" }],
]) {
  const glb = await new GLTFExporter().parseAsync(createPedestrian(style, colors), { binary: true });
  await writeFile(new URL("../public/models/" + file + ".glb", import.meta.url), new Uint8Array(glb));
  console.log("Exported " + file + ".glb (" + glb.byteLength + " bytes).");
}
