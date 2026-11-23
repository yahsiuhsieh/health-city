import { describe, expect, it } from "vitest";
import { assembleBlock, frontage, type Building } from "./building-assembler.ts";
import { plinthHeight } from "./terrain.ts";

const tall: Building = { x: 0, z: 0, w: 12, d: 12, floors: 7, style: 0, shopSide: 0 };
const short: Building = { ...tall, x: 12.25, z: 3, d: 6, floors: 3 };

describe("row buildings", () => {
  it("keeps openings above the adjoining roof and on the exposed part of the wall", () => {
    const roof = plinthHeight([[short.x-short.w/2,short.z]]) + .16 + 4.2 + 2*3.2 + 1.03;
    for (const night of [false, true]) {
      const eastFace = assembleBlock([tall, short], night).filter(item =>
        item.module !== "wall" && item.yaw === Math.PI/2 && Math.abs(item.at[0]-6) < .5
      );
      const exposed = eastFace.filter(item => item.at[2] < 0 && item.at[1] < roof);
      expect(exposed.some(item => item.module === "gf-entrance")).toBe(true);
      expect(exposed.some(item => item.module === "upper-window")).toBe(true);
      const adjoining = eastFace.filter(item => item.at[2] > 0);
      expect(adjoining.some(item => item.module === "upper-balcony")).toBe(true);
      expect(adjoining.every(item => item.at[1] >= roof)).toBe(true);
    }
  });

  it("preserves every street entrance and keeps openings off all four narrow joins", () => {
    const items = assembleBlock(frontage, true);
    const openings = items.filter(item => item.module.startsWith("gf-") ||
      item.module.startsWith("upper-") || item.module === "lit-glazing");
    for (const b of frontage) {
      for (const side of [b.shopSide, b.cornerShopSide]) {
        if (side === undefined) continue;
        const onStreet = openings.filter(item => item.yaw === side*Math.PI/2 &&
          (side === 0 ? Math.abs(item.at[2] - (b.z+b.d/2+.29)) < .01 && Math.abs(item.at[0]-b.x) < b.w/2
                      : Math.abs(item.at[0] - (b.x+b.w/2+.29)) < .01 && Math.abs(item.at[2]-b.z) < b.d/2));
        expect(onStreet.filter(item => item.module === "gf-entrance")).toHaveLength(1);
        expect(onStreet.some(item => item.module === "gf-shopfront")).toBe(true);
      }
    }
    for (const [i, a] of frontage.slice(0,-1).entries()) {
      const b = frontage[i+1]!;
      const alongX = i < 2;
      const normalAxis = alongX ? 0 : 2, tangentAxis = alongX ? 2 : 0;
      const sharedLow = alongX ? Math.max(a.z-a.d/2,b.z-b.d/2) : Math.max(a.x-a.w/2,b.x-b.w/2);
      const sharedHigh = alongX ? Math.min(a.z+a.d/2,b.z+b.d/2) : Math.min(a.x+a.w/2,b.x+b.w/2);
      const faces = alongX ? [[a.x+a.w/2,1],[b.x-b.w/2,3]] as const
                           : [[a.z-a.d/2,2],[b.z+b.d/2,0]] as const;
      for (const [plane, side] of faces) {
        const intrusions = openings.filter(({ at, yaw }) => yaw === side*Math.PI/2 &&
          Math.abs(at[normalAxis]-plane) < .35 && at[tangentAxis] > sharedLow &&
          at[tangentAxis] < sharedHigh && at[1] < 16);
        expect(intrusions).toHaveLength(0);
      }
    }
  });
});
