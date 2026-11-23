import { expect, it } from "vitest";
import { Object3D, Vector3 } from "three";
import { ankleOffset, createLegSolver, footfall, hipDrop } from "./walk-gait.ts";

it("holds the stance foot at one boardwalk position and lifts the opposite foot", () => {
  const stride = .83;
  const strike = footfall(0, stride, 0);
  const midStance = footfall(stride * .30, stride, 0);
  const pushOff = footfall(stride * .62, stride, 0);
  expect(strike.from).toBe(midStance.from);
  expect(pushOff.from).toBe(midStance.from);
  expect(strike.pitch).toBeLessThan(0);
  expect(midStance.pitch).toBe(0);
  expect(pushOff.pitch).toBeGreaterThan(0);
  const swing = footfall(stride * .81, stride, 0);
  expect(swing.lift).toBeCloseTo(.057);
  expect(swing.to).toBeGreaterThan(midStance.from);
  expect(swing.to).toBe(footfall(stride, stride, 0).from);
  const nextSwing = footfall(stride * 1.81, stride, 0);
  expect(nextSwing.to - nextSwing.from).not.toBeCloseTo(swing.to - swing.from, 3);
  for (let i = 0; i < 30; i++) {
    const distance = stride * i / 30;
    expect(Math.min(footfall(distance, stride, 0).lift, footfall(distance, stride, .5).lift)).toBe(0);
  }
});

it("raises the ankle during heel and toe contact and leaves the hip high when in reach", () => {
  expect(ankleOffset(-.19, 0).height).toBeGreaterThan(ankleOffset(0, 0).height);
  expect(ankleOffset(.26, 0).height).toBeGreaterThan(ankleOffset(0, 0).height);
  const hip = new Vector3(0, .87, 0);
  const ankle = new Vector3(0, .13, .29);
  expect(hipDrop(hip, new Vector3(0, .13, 0), .76)).toBe(0);
  const drop = hipDrop(hip, ankle, .76);
  expect(drop).toBeGreaterThan(0);
  hip.y -= drop;
  expect(hip.distanceTo(ankle)).toBeLessThan(.76);
});

it("bends the leg to reach a planted ankle and keeps its sole flat", () => {
  const thigh = new Object3D();
  const knee = new Object3D();
  const ankle = new Object3D();
  thigh.position.y = .82;
  knee.position.y = -.382;
  ankle.position.y = -.378;
  thigh.add(knee);
  knee.add(ankle);
  const goal = new Vector3(.03, .11, .21);
  createLegSolver()(thigh, knee, ankle, goal, .22, 0);
  const horizontal = new Vector3(.1, 0, 0);
  expect(ankle.getWorldPosition(new Vector3()).distanceTo(goal)).toBeLessThan(.00001);
  expect(ankle.localToWorld(horizontal).y).toBeCloseTo(goal.y);
});
