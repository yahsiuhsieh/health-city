import { expect, it } from "vitest";
import { assignTowerPlots, skylineDisplay, TOWER_DESIGNS } from "./skyline-layout.ts";
import { deriveHrvSkyline } from "../core/skyline.ts";
import { dailyModelOrder } from "./seeded-order.ts";

it("assigns the same five designs to the same plots for a fixed seed", () => {
  const plots = assignTowerPlots(24193);
  expect(assignTowerPlots(24193)).toEqual(plots);
  expect(assignTowerPlots(64739).map(plot => plot.design.id)).not.toEqual(plots.map(plot => plot.design.id));
  expect(plots.map(plot => plot.design.id).sort()).toEqual(TOWER_DESIGNS.map(design => design.id).sort());
});

it("adds stable plots in order and preserves the full count when the district fills", () => {
  const firstRow = assignTowerPlots(24193);
  const expanded = assignTowerPlots(24193, 4);
  expect(expanded.slice(0, 5)).toEqual(firstRow);
  expect(new Set(expanded.map(plot => plot.x + "/" + plot.z)).size).toBe(20);
  expect(skylineDisplay(deriveHrvSkyline(103.7))).toMatchObject({ visibleCount: 20, rows: 4, overflow: false });
  const high = deriveHrvSkyline(175.4);
  expect(high).toMatchObject({ rmssdMs: 175.4, buildingCount: 35 });
  expect(skylineDisplay(high)).toMatchObject({ visibleCount: 30, overflow: true });
});

it("keeps a daily roster stable while allowing later dates to pick different styles", () => {
  const models = ["van", "saloon", "hatchback", "pickup"];
  const roster = dailyModelOrder(models, "harbor-road", "2026-11-15");
  expect(dailyModelOrder(models, "harbor-road", "2026-11-15")).toEqual(roster);
  expect(dailyModelOrder(models, "harbor-road", "2026-11-14")).not.toEqual(roster);
  expect([...roster].sort()).toEqual([...models].sort());
});

it("occupies the front, middle and back of the city before adding the sixth tower", () => {
  const plots = assignTowerPlots(24193,6);
  expect(new Set(plots.map(p=>p.x+"/"+p.z)).size).toBe(30);
  const first = plots.slice(0,5);
  expect(first.some(p=>p.x > -80)).toBe(true);
  expect(first.some(p=>p.x < -160)).toBe(true);
  expect(first.some(p=>p.x < -95 && p.x > -155)).toBe(true);
  expect(first.some(p=>p.z < 0) && first.some(p=>p.z > 12)).toBe(true);
});
