import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { Box3, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

describe("representative harbor building delivery asset", () => {
  it("preserves metre scale, separate lighting surfaces, and batched geometry", async () => {
    const file = await readFile(new URL("../../public/models/harbor-building.glb", import.meta.url));
    const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    const model = await new GLTFLoader().parseAsync(buffer, "");
    const size = new Box3().setFromObject(model.scene).getSize(new Vector3());
    expect(size.x).toBeGreaterThan(7);
    expect(size.x).toBeLessThan(9);
    expect(size.y).toBeGreaterThan(8);
    expect(size.y).toBeLessThan(11);
    expect(size.z).toBeLessThan(7);
    for (const name of ["building-window-lit", "building-window-dark", "building-lamps"]) {
      const surface = model.scene.getObjectByName(name);
      expect(surface, name).toBeInstanceOf(Mesh);
    }
    let meshes = 0;
    let triangles = 0;
    model.scene.traverse(child => {
      if (!(child instanceof Mesh)) return;
      meshes++;
      expect(child.material).toBeInstanceOf(MeshStandardMaterial);
      triangles += (child.geometry.index?.count ?? child.geometry.attributes.position!.count) / 3;
    });
    expect(meshes).toBeLessThanOrEqual(20);
    expect(triangles).toBeLessThan(100000);
    expect(file.byteLength).toBeLessThan(4 * 1024 * 1024);
  });
});
