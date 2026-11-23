import {readFile} from "node:fs/promises";
import {Mesh} from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {expect,it} from "vitest";
import {deriveHrvSkyline,thresholdMs} from "../../core/skyline.ts";
import {SKYLINE_PLOTS,skylineDisplay} from "../skyline-layout.ts";
import {formQuotas,isOpenSpace,plotState} from "./interim-layout.ts";
import {assembleInterim} from "./interim-buildings.ts";
import {surfaceHeight} from "./terrain.ts";

it("keeps the fixed quotas, corner shops and a mixed first five",()=>{
  for(const [form,count] of Object.entries(formQuotas))
    expect(SKYLINE_PLOTS.filter(s=>s.interimForm===form)).toHaveLength(count);
  for(const site of SKYLINE_PLOTS){
    if(site.interimForm==="walkup")expect(Math.abs(site.cornerSide)).toBe(1);
    for(const id of site.adjacent)expect(SKYLINE_PLOTS[id]!.interimForm).not.toBe(site.interimForm);
  }
  // These pairs share a boundary and face one another across Orchard Lane, respectively.
  expect(SKYLINE_PLOTS[16]!.adjacent).toContain(17);
  expect(SKYLINE_PLOTS[21]!.adjacent).toContain(8);
  const first=SKYLINE_PLOTS.slice(0,5).map(s=>s.interimForm);
  expect(first.some(isOpenSpace)).toBe(true);
  expect(new Set(first.filter(f=>!isOpenSpace(f))).size).toBeGreaterThanOrEqual(2);
});

it("selects one daily state for every plot and keeps the raw count above capacity",()=>{
  for(const count of [0,5,20,30,null]){
    const hrv=deriveHrvSkyline(count===null?null:count*5);
    expect(skylineDisplay(hrv).plotCount).toBe(30);
    const states=SKYLINE_PLOTS.map(s=>plotState(s.id,count));
    expect(states.filter(s=>s==="tower")).toHaveLength(count??0);
    expect(states.filter(s=>s==="interim")).toHaveLength(count===null?0:30-count);
    expect(states.filter(s=>s==="wireframe")).toHaveLength(count===null?30:0);
  }
  expect(thresholdMs(4)).toBe(25);
  expect(deriveHrvSkyline(175)).toMatchObject({buildingCount:35});
  expect(skylineDisplay(deriveHrvSkyline(175)).overflow).toBe(true);
});

it("keeps the assembled roofs and chimneys below 12 metres and every kit module within budget",async()=>{
  const file=await readFile(new URL("../../../public/models/city-kit.glb",import.meta.url));
  const kit=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),"");
  kit.scene.traverse(mesh=>{
    if(!(mesh instanceof Mesh))return;
    const g=mesh.geometry;
    expect((g.index?.count??g.attributes.position!.count)/3).toBeLessThanOrEqual(600);
    g.computeBoundingBox();
  });
  for(const site of SKYLINE_PLOTS){
    const base=surfaceHeight(site.x-site.width/2,site.z)+.065;
    expect(assembleInterim(site,true,true).map(p=>p.module)).toEqual(["wall"]);
    const placements=assembleInterim(site,true);
    for(const p of placements){
      const mesh=kit.scene.getObjectByName(p.module) as Mesh;
      expect(mesh).toBeDefined();
      expect(p.at[1]+mesh.geometry.boundingBox!.max.y*p.size[1]-base).toBeLessThanOrEqual(12);
      expect(p.plotId).toBe(site.id);
    }
    if(!isOpenSpace(site.interimForm) && site.interimForm!=="hall"){
      const windows=placements.filter(p=>p.module.startsWith("upper-sash-window") && p.at[1]-base>3);
      const panes=placements.filter(p=>p.module==="lit-glazing" && p.at[1]-base>3);
      expect(panes.length/(2*windows.length)).toBeGreaterThanOrEqual(.30);
      expect(panes.length/(2*windows.length)).toBeLessThanOrEqual(.45);
      expect(assembleInterim(site,false).some(p=>p.module==="lit-glazing")).toBe(false);
    }
    if(isOpenSpace(site.interimForm)){
      const trees=placements.filter(p=>p.module==="street-tree").length;
      expect(trees).toBeGreaterThanOrEqual(site.interimForm==="park"?3:2);
      expect(trees).toBeLessThanOrEqual(site.interimForm==="park"?6:4);
    }
  }
});
