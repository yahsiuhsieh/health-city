import { expect, it } from "vitest";
import { OrthographicCamera, Vector3 } from "three";
import { addCameraClearance, CAMERA_FAR, CAMERA_NEAR } from "./camera-depth.ts";

it("preserves framing while keeping the full city between the depth planes during orbit", () => {
  const corners = [-270, 12].flatMap(x => [0, 61].flatMap(y => [-81, 81].map(z => new Vector3(x, y, z))));
  const camera = new OrthographicCamera(-55, 55, 35, -35, CAMERA_NEAR, CAMERA_FAR);
  for (const target of [new Vector3(-5, 3, 0), new Vector3(-258, 65, -58), new Vector3(12, 0, 56)]) {
    for (const radius of [12, 175]) {
      for (const elevation of [.1, .9]) {
        for (let turn = 0; turn < 12; turn++) {
          const azimuth = turn * Math.PI / 6;
          const horizontal = radius * Math.cos(elevation);
          camera.position.copy(target).add(new Vector3(horizontal * Math.sin(azimuth), radius * Math.sin(elevation), horizontal * Math.cos(azimuth)));
          camera.lookAt(target);
          camera.updateMatrixWorld(true);
          const framed = corners.map(point => point.clone().project(camera));
          addCameraClearance(camera.position, target);
          camera.updateMatrixWorld(true);
          for (const [index, point] of corners.entries()) {
            const projected = point.clone().project(camera);
            expect(projected.x).toBeCloseTo(framed[index]!.x);
            expect(projected.y).toBeCloseTo(framed[index]!.y);
            expect(Math.abs(projected.z)).toBeLessThan(1);
          }
        }
      }
    }
  }
});
