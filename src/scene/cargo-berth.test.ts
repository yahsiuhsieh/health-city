import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { Box3, Mesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { cargoPose } from "./port-motion.ts";
import { freighter, jibReach, port, receivingBay } from "./port-layout.ts";
import { promenadeRoute } from "./city/routes.ts";

it("lands the pallet on the receiving deck and keeps the hoist attached through the transfer", async () => {
  const bytes = await readFile(new URL("../../public/models/cargo-berth.glb", import.meta.url));
  const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
  const crane = scene.getObjectByName("CraneTurntable")!;
  const pallet = crane.getObjectByName("SlungPallet")!;
  const lines = crane.getObjectByName("HoistLines")!;
  const truck = scene.getObjectByName("QuaysideFlatbed")!;
  expect(scene.getObjectByName("Forklift")).toBeDefined();
  const meshes: Mesh[] = [];
  scene.traverse(node => { if (node instanceof Mesh) meshes.push(node); });
  expect(meshes.length).toBeLessThan(16);
  expect(meshes.some(mesh => !Array.isArray(mesh.material) && mesh.material.name === "work-lamps")).toBe(true);
  const point = new Vector3();
  for (const seconds of [0, 450, 900, 1260, 1800, 2400, 3100, 0]) {
    const { yaw, height } = cargoPose(seconds);
    crane.rotation.y = yaw;
    pallet.position.y = height;
    lines.scale.y = port.sheaveHeight - port.slingHeight - height;
    scene.updateMatrixWorld(true);
    const bottom = pallet.getWorldPosition(point).clone();
    const cableEnd = lines.localToWorld(new Vector3(0, -1, 0));
    expect(cableEnd.distanceTo(bottom.clone().add(new Vector3(0, port.slingHeight, 0)))).toBeLessThan(.00001);
    if (seconds === 0) {
      expect(bottom.x + port.craneX).toBeCloseTo(freighter.x);
      expect(bottom.z + port.craneZ - freighter.z).toBeGreaterThan(10);
      expect(bottom.z + port.craneZ - freighter.z).toBeLessThan(freighter.length/2);
    }
    if (yaw > 0 && yaw < port.receivingAngle) expect(bottom.y).toBeGreaterThan(5);
    if (seconds === 1800) {
      expect(bottom.x).toBeCloseTo(truck.position.x);
      expect(bottom.z).toBeCloseTo(truck.position.z);
      expect(bottom.y).toBeCloseTo(port.trailerDeck);
      const bed = meshes.filter(mesh => mesh.parent === truck)[0]!;
      // A surface vertex at the receiver height ties the landing to the exported bed.
      const vertices = bed.geometry.getAttribute("position");
      let foundDeck = false;
      for (let i = 0; i < vertices.count; i++) {
        if (Math.abs(vertices.getY(i) - bottom.y) < .001 && vertices.getX(i) > 1) foundDeck = true;
      }
      expect(foundDeck).toBe(true);
      expect(new Box3().setFromObject(pallet).min.y).toBeCloseTo(bottom.y);
    }
  }
  expect(receivingBay.x ** 2 + receivingBay.z ** 2).toBeCloseTo(jibReach ** 2);
});

it("keeps the public quay walk outside the crane sweep and cargo vehicle entrance", () => {
  for (let d = 0; d < promenadeRoute.length; d += .16) {
    const { x, z } = promenadeRoute.at(d);
    const yaw = Math.atan2(port.craneZ - z, x - port.craneX);
    const inSweep = yaw >= -.12 && yaw <= port.receivingAngle + .12
      && Math.hypot(x - port.craneX,z - port.craneZ) <= jibReach + .85;
    expect(inSweep).toBe(false);
    expect(x > -16.8 && x < -12 && z > -19.7 && z < -12.55).toBe(false);
  }
});

it("fits the design vessel in the shared basin and entrance",async()=>{
  const {HARBOR_MOUTH,turningBasin,armMarks,breakwaterArms}=await import("./city/harbor-plan.ts");
  const {basinClearance}=await import("./sleep/clearance.ts");
  const {buildSeabed}=await import("./ocean/seabed.ts");
  expect(breakwaterArms).toHaveLength(2);
  expect(turningBasin.radius*2).toBe(96);
  expect(basinClearance(turningBasin.center,turningBasin.radius)).toBeGreaterThanOrEqual(6);
  const heads=breakwaterArms.slice(-2).map(arm=>arm.at(-1)!);
  const starboard=heads.findIndex(head=>head[1]<HARBOR_MOUTH.point[1]);
  expect(armMarks[starboard]).toBe("red");
  expect(Math.abs(heads[0]![1]-heads[1]![1])-6).toBeGreaterThanOrEqual(60);
  const bed=buildSeabed();
  try{
    expect(bed.depthAt(...turningBasin.center)).toBeCloseTo(7,1);
    expect(bed.depthAt(...HARBOR_MOUTH.point)).toBeGreaterThanOrEqual(8);
  }finally{bed.texture.dispose();}
});

it("lets the tug-assisted freighter leave with a two-metre margin",async()=>{
  const {freighterTestPath}=await import("../../tests/freighter-path.ts");
  const {harborClearance}=await import("./sleep/clearance.ts");
  const {turningBasin,HARBOR_MOUTH}=await import("./city/harbor-plan.ts");
  const path=freighterTestPath();
  for(const [i,p] of path.entries()){
    const last=path[Math.max(0,i-1)]!;
    expect(Math.hypot(p.x-last.x,p.z-last.z)).toBeLessThanOrEqual(.5);
    expect(Math.abs(p.yaw-last.yaw)).toBeLessThanOrEqual(Math.PI/90);
    expect(harborClearance(p,p.leg==="Cast off","Freighter").minimum).toBeGreaterThanOrEqual(0);
    if(p.leg==="Turn east"){
      const offset=Math.hypot(p.x-turningBasin.center[0],p.z-turningBasin.center[1]);
      expect(offset+Math.hypot(59/2,11/2)+2).toBeLessThan(87/2);
    }
  }
  expect(path.filter(p=>p.leg==="Cast off").at(-1)!.x-path[0]!.x).toBeCloseTo(3,8);
  expect(path.at(-1)!.yaw).toBe(0);
  expect(path.at(-1)!.x-59/2-2).toBeGreaterThan(HARBOR_MOUTH.point[0]);
});
