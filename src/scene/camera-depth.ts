import type { Vector3 } from "three";

export const CAMERA_DEPTH_OFFSET = 320;
export const CAMERA_FAR = 880;
export const CAMERA_NEAR = .1;

export function addCameraClearance(eye: Vector3, target: Vector3) {
  // Moving along this axis changes depth without changing orthographic framing.
  return eye.addScaledVector(eye.clone().sub(target).normalize(), CAMERA_DEPTH_OFFSET);
}
