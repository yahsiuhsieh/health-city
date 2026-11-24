import { towerSites } from "./city/city-plan.data.ts";
import type { HrvSkyline } from "../core/skyline.ts";

import {TOWER_DESIGNS,DISTRICT_SEED,designsForRow} from "./tower-designs.ts";
export {TOWER_DESIGNS} from "./tower-designs.ts";

export type TowerDesignId = typeof TOWER_DESIGNS[number]["id"];
export type SceneView = "sleep" | "sleep-island" | "ridge" | "world" | "harbor" | "walk" | "road" | "detail" | "cargo" | "berth" | "skyline" | "square" | "side" | TowerDesignId;
export type CameraCommand = { view: SceneView; revision: number; districtRows: number };

export function isTowerView(view: SceneView): view is TowerDesignId {
  return TOWER_DESIGNS.some(design => design.id === view);
}
export const TOWER_ASSETS = TOWER_DESIGNS.map(design => "/models/tower-" + design.id + ".glb");

const PLOTS_PER_ROW = 5;
export const SKYLINE_DISPLAY_CAPACITY = 6 * PLOTS_PER_ROW;

export function assignTowerPlots(seed: number, rows = 1) {
  return Array.from({ length: rows }, (_, row) => {
    const designs = designsForRow(seed,row);
    return designs.map((design,index) => {
      const site=towerSites[row*PLOTS_PER_ROW+index]!;
      return { ...site, design };
    });
  }).flat();
}

export const SKYLINE_PLOTS = assignTowerPlots(DISTRICT_SEED, SKYLINE_DISPLAY_CAPACITY / PLOTS_PER_ROW);

export function skylineDisplay(hrv: HrvSkyline) {
  const count = hrv.status === "available" ? hrv.buildingCount : 0;
  const visibleCount = Math.min(count, SKYLINE_DISPLAY_CAPACITY);
  const rows = Math.max(1, Math.ceil(visibleCount / PLOTS_PER_ROW));
  return { visibleCount, rows, plotCount: SKYLINE_DISPLAY_CAPACITY, overflow: count > visibleCount };
}
