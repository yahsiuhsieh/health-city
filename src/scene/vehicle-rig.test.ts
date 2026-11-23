import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { Object3D, SpotLight } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createVehicleRig } from "./vehicle-rig.ts";

it.each(["van", "saloon", "hatchback", "pickup"])("animates the wheel pivots from the %s GLB", async style => {
  const file = await readFile(new URL("../../public/models/vehicle-" + style + ".glb", import.meta.url));
  const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  const source = await new GLTFLoader().parseAsync(buffer, "");
  const rig = createVehicleRig(source.scene);
  try {
    const wheels: Object3D[] = [];
    rig.model.traverse(node => { if (node.name.startsWith("wheel-")) wheels.push(node); });
    expect(wheels).toHaveLength(4);
    rig.poseWheels(.68, 0);
    for (const wheel of wheels) expect(wheel.rotation.x).toBeCloseTo(2);
    rig.poseWheels(.34, -1 / 4.8);
    for (const wheel of wheels) expect(wheel.rotation.x).toBeCloseTo(1);
    const inner = wheels.find(wheel => wheel.position.z > 0 && wheel.position.x < 0)!;
    const outer = wheels.find(wheel => wheel.position.z > 0 && wheel.position.x > 0)!;
    expect(inner.rotation.y).toBeLessThan(outer.rotation.y);
    expect(outer.rotation.y).toBeLessThan(-.2);
    expect(wheels.filter(wheel => wheel.position.z < 0).every(wheel => wheel.rotation.y === 0)).toBe(true);
    rig.poseWheels(.68, 0);
    for (const wheel of wheels) expect(wheel.rotation.x).toBeCloseTo(2);
    expect(inner.rotation.y).toBe(0);
    expect(outer.rotation.y).toBe(0);

    const headlights = rig.model.getObjectByName("Headlight beams")!;
    expect(headlights.visible).toBe(false);
    rig.setNight(true);
    expect(headlights.visible).toBe(true);
    const lamps = headlights.children.filter(light => light instanceof SpotLight);
    expect(lamps).toHaveLength(2);
    for (const lamp of lamps) {
      expect(lamp.target.parent).toBe(headlights);
      expect(lamp.target.position.z).toBeGreaterThan(lamp.position.z);
      expect(lamp.target.position.y).toBeLessThan(lamp.position.y);
    }
    rig.setNight(false);
    expect(headlights.visible).toBe(false);
  } finally {
    rig.dispose();
  }
});
