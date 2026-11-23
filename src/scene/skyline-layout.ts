import { plotSite } from "./harbor-layout.ts";
import { seededOrder } from "./seeded-order.ts";
import type { HrvSkyline } from "../core/skyline.ts";

export const TOWER_DESIGNS = [
  { id: "glass", name: "Glass spire", style: "Modern glass", height: 60.2,
    description: "Blue curtain walls, narrow metal fins, and a sloping crown with a spire." },
  { id: "deco", name: "Deco crown", style: "Art Deco", height: 51,
    description: "Warm stone, bronze accents, vertical piers, and a stepped geometric crown." },
  { id: "concrete", name: "Concrete terraces", style: "Brutalist", height: 43,
    description: "Heavy concrete volumes, deep window recesses, and projecting terraces." },
  { id: "ribbon", name: "Ribbon tower", style: "Organic", height: 53,
    description: "A curved glass core with oval floors and flowing white structural ribbons." },
  { id: "brick", name: "Brick crown", style: "Classic masonry", height: 50.1,
    description: "Red masonry, arched windows, pale cornices, and a green copper crown." },
] as const;

export type TowerDesignId = typeof TOWER_DESIGNS[number]["id"];
export type SceneView = "sleep" | "ridge" | "world" | "harbor" | "walk" | "road" | "detail" | "berth" | "skyline" | "square" | "side" | TowerDesignId;
export type CameraCommand = { view: SceneView; revision: number; districtRows: number };

export function isTowerView(view: SceneView): view is TowerDesignId {
  return TOWER_DESIGNS.some(design => design.id === view);
}
export const TOWER_ASSETS = TOWER_DESIGNS.map(design => "/models/tower-" + design.id + ".glb");

const DISTRICT_SEED = 24193;
const PLOTS_PER_ROW = 5;
export const TOWER_SCALE = .75;
export const SKYLINE_DISPLAY_CAPACITY = 6 * PLOTS_PER_ROW;

export function assignTowerPlots(seed: number, rows = 1) {
  return Array.from({ length: rows }, (_, row) => {
    const designs = seededOrder(TOWER_DESIGNS, seed + row * 3719);
    return designs.map((design,index) => {
      const [x,z,yaw] = plotSite((row + [0,3,5,2,4][index]!) % 6, [3,1,4,0,2][index]!);
      return { id: row*PLOTS_PER_ROW+index, x, z, yaw, design };
    });
  }).flat();
}

export const SKYLINE_PLOTS = assignTowerPlots(DISTRICT_SEED, SKYLINE_DISPLAY_CAPACITY / PLOTS_PER_ROW);

export function skylineDisplay(hrv: HrvSkyline) {
  const count = hrv.status === "available" ? hrv.buildingCount : 0;
  const visibleCount = Math.min(count, SKYLINE_DISPLAY_CAPACITY);
  const rows = Math.max(1, Math.ceil(visibleCount / PLOTS_PER_ROW));
  return { visibleCount, rows, plotCount: rows * PLOTS_PER_ROW, overflow: count > visibleCount };
}
