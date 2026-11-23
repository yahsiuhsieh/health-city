import { Quaternion, Vector3 } from "three";
import type { Object3D } from "three";

const STANCE_FRACTION = .62;
const HEEL_STRIKE = -.19;
const TOE_OFF = .26;
const SOLE_HEIGHT = .11;
const HEEL_Z = -.063;
const TOE_Z = .135;
const DOWN = new Vector3(0, -1, 0);
const UP = new Vector3(0, 1, 0);
const RIGHT = new Vector3(1, 0, 0);

function ease(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

export function footfall(distance: number, stride: number, phaseOffset: number) {
  const cycle = distance / stride + phaseOffset;
  const step = Math.floor(cycle);
  const phase = cycle - step;
  const contact = (index: number) => (index - phaseOffset + STANCE_FRACTION / 2
    + .04 * Math.sin(index * 2.37 + phaseOffset * 3)) * stride;
  const from = contact(step);
  if (phase <= STANCE_FRACTION) {
    const heel = HEEL_STRIKE * (1 - ease(phase / .15));
    const toe = TOE_OFF * ease((phase - .47) / (STANCE_FRACTION - .47));
    return { from, to: from, blend: 0, lift: 0, pitch: heel + toe };
  }
  const swing = (phase - STANCE_FRACTION) / (1 - STANCE_FRACTION);
  const clearance = 16 * (swing * (1 - swing)) ** 2;
  const pitch = TOE_OFF * (1 - ease(swing / .43)) + HEEL_STRIKE * ease((swing - .54) / .46);
  return {
    from,
    to: contact(step + 1),
    blend: ease(swing),
    lift: .057 * clearance,
    pitch,
  };
}

export function ankleOffset(pitch: number, lift: number) {
  // Roll the sole around the heel at contact and the toe at push-off.
  const pivot = pitch < 0 ? HEEL_Z : TOE_Z;
  const cosine = Math.cos(pitch);
  const sine = Math.sin(pitch);
  return {
    forward: pivot * (1 - cosine) + SOLE_HEIGHT * sine,
    height: SOLE_HEIGHT * cosine + pivot * sine + lift,
  };
}

export function hipDrop(hip: Vector3, ankle: Vector3, legLength: number) {
  const dx = hip.x - ankle.x;
  const dz = hip.z - ankle.z;
  const reachableHeight = Math.sqrt(Math.max(0, (legLength - .003) ** 2 - dx ** 2 - dz ** 2));
  return Math.max(0, hip.y - ankle.y - reachableHeight);
}

export function createLegSolver() {
  const direction = new Vector3();
  const bend = new Vector3();
  const upper = new Vector3();
  const lower = new Vector3();
  const lowerOrientation = new Quaternion();
  const footOrientation = new Quaternion();
  const pitchOrientation = new Quaternion();

  return (thigh: Object3D, knee: Object3D, ankle: Object3D, goal: Vector3, yaw: number, pitch: number) => {
    const upperLength = knee.position.length();
    const lowerLength = ankle.position.length();
    direction.copy(goal).sub(thigh.position);
    const reach = Math.min(direction.length(), upperLength + lowerLength - .0001);
    direction.normalize();
    bend.set(0, 0, 1).addScaledVector(direction, -direction.z).normalize();

    // Bend the knee toward the toes while keeping the ankle at its contact point.
    const along = (upperLength ** 2 - lowerLength ** 2 + reach ** 2) / (2 * reach);
    const across = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
    upper.copy(direction).multiplyScalar(along).addScaledVector(bend, across);
    lower.copy(direction).multiplyScalar(reach).sub(upper);
    thigh.quaternion.setFromUnitVectors(DOWN, upper.normalize());
    lowerOrientation.setFromUnitVectors(DOWN, lower.normalize());
    knee.quaternion.copy(thigh.quaternion).invert().multiply(lowerOrientation);
    footOrientation.setFromAxisAngle(UP, yaw).multiply(pitchOrientation.setFromAxisAngle(RIGHT, pitch));
    ankle.quaternion.copy(lowerOrientation).invert().multiply(footOrientation);
  };
}
