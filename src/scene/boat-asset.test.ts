import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { Box3, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

describe("representative boat delivery asset", () => {
  it("loads its self-contained GLB with metre scale and inspectable lighting surfaces", async () => {
    const file = await readFile(new URL("../../public/models/working-boat.glb", import.meta.url));
    const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    const model = await new GLTFLoader().parseAsync(buffer, "");
    const size = new Box3().setFromObject(model.scene).getSize(new Vector3());
    expect(size.x).toBeGreaterThan(8);
    expect(size.x).toBeLessThan(10);
    expect(size.y).toBeGreaterThan(4);
    expect(size.z).toBeLessThan(4);
    for (const name of ["cargo-hull", "open-cargo-deck", "cargo-hatches", "cargo-crane", "wheelhouse"]) {
      expect(model.scene.getObjectByName(name), name).toBeDefined();
    }
    let windows = 0;
    let triangles = 0;
    model.scene.traverse(child => {
      if (!(child instanceof Mesh)) return;
      expect(child.material).toBeInstanceOf(MeshStandardMaterial);
      if (child.name.startsWith("cabin-window")) windows++;
      triangles += (child.geometry.index?.count ?? child.geometry.attributes.position!.count) / 3;
    });
    expect(windows).toBeGreaterThan(12);
    expect(triangles).toBeLessThan(100000);
    expect(file.byteLength).toBeLessThan(3 * 1024 * 1024);
  });
});

it("keeps the four permanent vessels and the deck-scale captain independently placeable", async () => {
  const bytes = await readFile(new URL("../../public/models/harbor-fleet.glb",import.meta.url));
  const {scene} = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),"");
  const meshes: Mesh[] = [];
  scene.traverse(node => { if (node instanceof Mesh) meshes.push(node); });
  expect(meshes.map(node=>node.name).sort()).toEqual(["Captain","Freighter","Schooner","Trawler","Tug"]);
  for (const node of meshes) {
    expect(node).toBeInstanceOf(Mesh);
    const dimensions = new Box3().setFromObject(node).getSize(new Vector3());
    if (node.name === "Captain") {
      expect(dimensions.y).toBeGreaterThan(1.65);
      expect(dimensions.y).toBeLessThan(1.9);
    } else {
      expect(dimensions.x).toBeGreaterThan(dimensions.y);
      expect(dimensions.x).toBeGreaterThan(dimensions.z);
    }
  }
});
