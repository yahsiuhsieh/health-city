import { readFile } from "node:fs/promises";
import { Box3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { expect, it } from "vitest";
import { coast } from "./coastline.ts";
import { coastalDepth } from "./coastal-depth.ts";
import { neighborhoodWalk, diagonal, fitsTree, inlandBlocks, inlandSouth, inlandNorth, laneHalfWidth, plotDepth, streets } from "./harbor-layout.ts";
import { SKYLINE_PLOTS, TOWER_DESIGNS } from "./skyline-layout.ts";

it("keeps the delivered towers inside their blocks and reserves their full width for planting", async () => {
  const bounds = await Promise.all(TOWER_DESIGNS.map(async design => {
    const file = await readFile(new URL("../../public/models/tower-" + design.id + ".glb", import.meta.url));
    const asset = await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), "");
    return new Box3().setFromObject(asset.scene);
  }));
  for (const plot of SKYLINE_PLOTS) {
    const box = bounds[TOWER_DESIGNS.indexOf(plot.design)]!;
    expect(Math.max(-box.min.x, box.max.x)).toBeLessThanOrEqual(7.5);
    expect(Math.max(-box.min.z, box.max.z)).toBeLessThanOrEqual(6);
    for (const localX of [box.min.x, box.max.x]) for (const localZ of [box.min.z, box.max.z]) {
      const x = plot.x + localX*Math.cos(plot.yaw) + localZ*Math.sin(plot.yaw);
      const z = plot.z - localX*Math.sin(plot.yaw) + localZ*Math.cos(plot.yaw);
      expect(fitsTree(x,z,1)).toBe(false);

      expect(plot.x).toBeLessThan(streets.back);
      const block = inlandBlocks.find(block=>plot.x>block.west && plot.x<block.east)!;
      expect(x).toBeGreaterThan(block.west + laneHalfWidth);
      expect(x).toBeLessThan(block.east - (block.east === streets.back ? streets.half : laneHalfWidth));
      expect(z).toBeGreaterThan(inlandSouth + laneHalfWidth);
      expect(z).toBeLessThan(inlandNorth - laneHalfWidth);
      for (const cross of block.crossStreets) expect(Math.abs(cross-z)).toBeGreaterThan(laneHalfWidth);
    }
  }
});

it("connects the inland streets to the harbor and keeps the tower entrances on the sidewalk side", () => {
  expect(inlandBlocks[0]!.east).toBe(streets.back);
  expect(inlandBlocks[0]!.crossStreets).toEqual([streets.side, streets.market]);
  for (const [i, block] of inlandBlocks.entries()) {
    if (i > 0) expect(block.east).toBe(inlandBlocks[i - 1]!.west);
    const parcels = SKYLINE_PLOTS.filter(plot => plot.x > block.west && plot.x < block.east);
    for (const plot of parcels) {
      // These entrances face local positive Z. A quarter turn points them at the east sidewalk.
      expect(plot.yaw).toBeCloseTo(Math.PI / 2);
      expect(plot.x + plotDepth / 2).toBeLessThan(block.east - (i ? laneHalfWidth : streets.half));
    }
    if (!i) continue;
    const cross = block.crossStreets[0]!;
    expect(parcels.filter(plot => plot.z < cross).length).toBeGreaterThanOrEqual(2);
    expect(parcels.filter(plot => plot.z > cross).length).toBeGreaterThanOrEqual(2);
  }
});

it("has shallow water along the entire closed bank, including the closing segment", () => {
  const { texture, bounds, margin } = coastalDepth();
  try {
    const { data, width, height } = texture.image;
    expect.assert(data instanceof Uint8Array);
    for (const [i, a] of coast.entries()) {
      const b = coast[(i + 1) % coast.length]!;
      const x = (a.waterline[0] + b.waterline[0])/2;
      const z = (a.waterline[1] + b.waterline[1])/2;
      const ix = Math.floor((x-bounds.x)/bounds.z*width);
      const iz = Math.floor((z-bounds.y)/bounds.w*height);
      expect(data[(iz*width+ix)*4]! / 255 * margin).toBeLessThan(.4);
    }
  } finally { texture.dispose(); }
});

it("keeps the public walk, diagonal street and harbor work areas clear of tree crowns", () => {
  for (let distance=0; distance<neighborhoodWalk.length; distance+=.5) {
    const {x,z}=neighborhoodWalk.at(distance);
    expect(fitsTree(x,z,1)).toBe(false);
  }
  const [start,end]=diagonal;
  for (let i=0; i<=20; i++) {
    expect(fitsTree(start[0]+(end[0]-start[0])*i/20,start[1]+(end[1]-start[1])*i/20,1)).toBe(false);
  }
  for (const z of [-45,0,40]) expect(fitsTree(streets.coast+streets.half,z,1)).toBe(false);
});
