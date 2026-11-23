import {vesselLengths,vesselBeams} from "./city/harbor-plan.ts";
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

it("keeps the permanent fleet and the deck-scale captain independently placeable", async () => {
  const bytes = await readFile(new URL("../../public/models/harbor-fleet.glb",import.meta.url));
  const {scene} = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),"");
  const meshes: Mesh[] = [];
  scene.traverse(node => { if (node instanceof Mesh) meshes.push(node); });
  expect(meshes.map(node=>node.name).sort()).toEqual(["Captain","Freighter","Motorboat","Schooner","Trawler","Tug","WaterTaxi"]);
  for (const node of meshes) {
    expect(node).toBeInstanceOf(Mesh);
    const dimensions = new Box3().setFromObject(node).getSize(new Vector3());
    if (node.name === "Captain") {
      expect(dimensions.y).toBeGreaterThan(1.65);
      expect(dimensions.y).toBeLessThan(1.9);
    } else {
      expect(dimensions.x).toBeGreaterThan(dimensions.y);
      expect(dimensions.x).toBeCloseTo(vesselLengths[node.name]!);
      expect(dimensions.z).toBeCloseTo(vesselBeams[node.name]!);
      expect((node.geometry.index?.count??node.geometry.attributes.position!.count)/3).toBeLessThan(node.name==="Freighter"?60000:15000);
    }
  }
});

it("exports the 16 m working boat with its underwater fittings and working sockets",async()=>{
  const bytes=await readFile(new URL("../../public/models/city-working-boat.glb",import.meta.url));
  const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),"");
  const size=new Box3().setFromObject(scene).getSize(new Vector3());
  expect(size.x).toBeGreaterThan(15);expect(size.x).toBeLessThan(17);
  expect(size.z).toBeCloseTo(5,0);
  for(const name of ["keel","rudder","propeller","cargo-hull","cargo-hatches","wheelhouse","cargo-crane","bow-anchor","anchor-ball","anchor-light","captain-socket"])expect(scene.getObjectByName(name),name).toBeDefined();
  let windows=0,shutters=0,triangles=0;
  scene.traverse(n=>{
    if(n instanceof Mesh){
      if(n.name.startsWith("cabin-window"))windows++;
      if(n.name.startsWith("cabin-shutter"))shutters++;
      triangles+=(n.geometry.index?.count??n.geometry.attributes.position!.count)/3;
    }
  });
  expect(windows).toBeGreaterThan(12);expect(shutters).toBe(windows);expect(triangles).toBeLessThan(30000);
});

it("places the captain on the bridge wing facing the bow with room outside the wheelhouse", async () => {
  const loader = new GLTFLoader();
  const [boat, fleet] = await Promise.all(["city-working-boat", "harbor-fleet"].map(async name => {
    const bytes = await readFile(new URL("../../public/models/" + name + ".glb", import.meta.url));
    return (await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "")).scene;
  }));
  const wing = new Box3().setFromObject(boat!.getObjectByName("bridge-wing")!);
  const cabin = new Box3().setFromObject(boat!.getObjectByName("wheelhouse")!);
  const socket = boat!.getObjectByName("captain-socket")!;
  const captain = fleet!.getObjectByName("Captain")!;
  socket.getWorldPosition(captain.position);
  socket.getWorldQuaternion(captain.quaternion);
  const body = new Box3().setFromObject(captain);
  expect(body.min.y).toBeCloseTo(wing.max.y, 2);
  expect(body.min.x).toBeGreaterThan(wing.min.x);
  expect(body.max.x).toBeLessThan(wing.max.x);
  expect(body.min.z).toBeGreaterThan(wing.min.z);
  expect(body.max.z).toBeLessThan(wing.max.z);
  expect(body.intersectsBox(cabin)).toBe(false);
  expect(captain.getWorldDirection(new Vector3()).x).toBeCloseTo(1);
});
