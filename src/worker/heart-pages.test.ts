import { describe, expect, it } from "vitest";
import { mergeHeartRows } from "./heart-pages.ts";

describe("Heart rate continuation aggregation", () => {
  const late = [["start", "end", 80, 2, "2026-11-04T00:03:00Z", "2026-11-04T00:04:00Z"]];
  it("combines page fragments using sample counts instead of averaging page means", () => {
    const early = [["start", "end", 60, 1, "2026-11-04T00:01:00Z", "2026-11-04T00:01:00Z"]];
    const result = mergeHeartRows(late, early);
    expect(result[0]!.slice(2, 4)).toEqual([220 / 3, 3]);
    expect(late[0]![3]).toBe(2);
  });
  it("preserves unavailable intervals and rejects overlap without changing the accumulated page", () => {
    const empty = [["start", "end", null, 0, null, null]];
    expect(mergeHeartRows(empty, late)).toEqual(late);
    expect(mergeHeartRows(empty, empty)).toEqual(empty);
    expect(() => mergeHeartRows(late, late)).toThrow("overlap");
    expect(late[0]![3]).toBe(2);
  });
});
