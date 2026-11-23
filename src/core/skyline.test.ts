import { describe, expect, it } from "vitest";
import { deriveHrvSkyline } from "./skyline.ts";

describe("daily HRV skyline", () => {
  it.each([[0, 0], [4.99, 0], [5, 1], [14.99, 2], [27.4, 5], [265.1, 53]])(
    "maps %s ms to %s buildings without a display cap", (rmssdMs, buildingCount) => {
      expect(deriveHrvSkyline(rmssdMs)).toEqual({ status: "available", rmssdMs, buildingCount });
    },
  );
  it("keeps unavailable HRV distinct from a recorded zero", () => {
    expect(deriveHrvSkyline(null)).toEqual({ status: "unavailable" });
    expect(deriveHrvSkyline(0)).toEqual({ status: "available", rmssdMs: 0, buildingCount: 0 });
  });
  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_VALUE])(
    "rejects an invalid numeric input without inventing a zero", value => {
      expect(deriveHrvSkyline(value).status).toBe("invalid");
    },
  );
});
