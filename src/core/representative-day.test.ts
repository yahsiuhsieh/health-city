import { expect, it } from "vitest";
import { stepsAt, SYNTHETIC_DAYS, trafficAt } from "./representative-day.ts";

const [day, quietDay, , missingHrvDay] = SYNTHETIC_DAYS;

it("uses the new five-minute step total at an interval boundary", () => {
  expect(stepsAt(day, 11 * 3600 - .25)).toMatchObject({ steps: 128, pedestrianCount: 2 });
  expect(stepsAt(day, 11 * 3600)).toEqual({
    steps: 435, pedestrianCount: 6, startSeconds: 39600, endSeconds: 39900,
  });
  expect(stepsAt(quietDay, 11 * 3600)).toMatchObject({ steps: 158, pedestrianCount: 2 });
});

it("distinguishes recorded zero and missing steps even when both show an empty walk", () => {
  expect(stepsAt(day, 0)).toMatchObject({ steps: 0, pedestrianCount: 0 });
  expect(stepsAt(day, 15 * 3600)).toMatchObject({ steps: null, pedestrianCount: 0 });
  expect(stepsAt(missingHrvDay, 12 * 3600)).toMatchObject({ steps: 320, pedestrianCount: 4 });
});

it("uses the last interval of the selected date at the completed-day position", () => {
  const { durationSeconds } = day;
  expect(stepsAt(day, durationSeconds)).toEqual(stepsAt(day, durationSeconds - 1));
});

it("uses the current interval's mean total energy independently of steps", () => {
  expect(stepsAt(day, 0).pedestrianCount).toBe(0);
  expect(trafficAt(day, 0)).toMatchObject({ totalKcal: 5.5, meanKcalPerMinute: 1.1, vehicleCount: 1 });
  expect(trafficAt(day, 12 * 3600)).toMatchObject({ totalKcal: 22.5, meanKcalPerMinute: 4.5, vehicleCount: 4 });
  expect(trafficAt(day, 8 * 3600)).toEqual(trafficAt(SYNTHETIC_DAYS[2], 8 * 3600));
});

it("distinguishes missing calorie data and an explicit zero", () => {
  expect(trafficAt(day, 15 * 3600)).toMatchObject({ totalKcal: null, meanKcalPerMinute: null, vehicleCount: 0 });
  expect(trafficAt(quietDay, 5 * 3600)).toMatchObject({ totalKcal: 0, meanKcalPerMinute: 0, vehicleCount: 0 });
});
