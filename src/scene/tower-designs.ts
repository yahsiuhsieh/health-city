import {seededOrder} from "./seeded-order.ts";

export const TOWER_DESIGNS = [
  { id: "glass", name: "Glass spire", style: "Modern glass",
    description: "Blue curtain walls, narrow metal fins, and a sloping crown with a spire." },
  { id: "deco", name: "Deco crown", style: "Art Deco",
    description: "Warm stone, bronze accents, vertical piers, and a stepped geometric crown." },
  { id: "concrete", name: "Concrete terraces", style: "Brutalist",
    description: "Heavy concrete volumes, deep window recesses, and projecting terraces." },
  { id: "ribbon", name: "Ribbon tower", style: "Organic",
    description: "A curved glass core with oval floors and flowing white structural ribbons." },
  { id: "brick", name: "Brick crown", style: "Classic masonry",
    description: "Red masonry, arched windows, pale cornices, and a green copper crown." },
] as const;

export const FLOOR_HEIGHT=3.8;
export function plotTowerHeight(x:number,z:number){
  const distance=Math.hypot(x+97,z-18);
  const floors=Math.round((36+56*Math.exp(-((distance/75)**2)))/FLOOR_HEIGHT);
  return floors*FLOOR_HEIGHT;
}
export const DISTRICT_SEED=24193;
export function designsForRow(seed:number,row:number){
  return seededOrder(TOWER_DESIGNS,seed+row*3719);
}
