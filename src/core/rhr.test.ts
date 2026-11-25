import { expect, it } from "vitest";
import { canonicalRhr, reservoirLevel, validRhrRecords } from "./rhr.ts";

it("retains an agreed value and method and reports conflicting records", () => {
  const first = { bpm: 58, method: null };
  expect(canonicalRhr([])).toEqual({status: "none"});
  for (const records of [[first], [first, first]]) {
    expect(canonicalRhr(records)).toEqual({status: "value", ...first});
  }
  for (const other of [{...first, bpm: 59}, {...first, method: "NEW_METHOD"}]) {
    const records = [first, other];
    expect(canonicalRhr(records)).toEqual({status: "conflict", records});
  }
});

it("validates values independently of the gauge limits", () => {
  for (const bpm of [-1, 0, 0.5, Infinity]) expect(validRhrRecords([{bpm, method: null}])).toBe(false);
  expect(validRhrRecords([{bpm: 90, method: "NEW_METHOD"}])).toBe(true);
  expect(validRhrRecords([{bpm: 58}])).toBe(false);
  expect([30, 40, 55, 65, 80, 90].map(reservoirLevel)).toEqual([4, 4, 10, 14, 20, 20]);
});

it("uses the sleep estimate first and falls back to the awake estimate", () => {
  const sleep = { bpm: 60, method: "WITH_SLEEP" };
  const awake = { bpm: 63, method: "ONLY_WITH_AWAKE_DATA" };
  for (const records of [[awake, sleep], [sleep, awake], [awake, sleep, sleep]]) {
    expect(canonicalRhr(records)).toEqual({ status: "value", ...sleep });
  }
  expect(canonicalRhr([awake])).toEqual({ status: "value", ...awake });
  expect(canonicalRhr([sleep, {...sleep, bpm: 61}, awake]).status).toBe("conflict");
});
