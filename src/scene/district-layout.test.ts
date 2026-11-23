import { readFile } from "node:fs/promises";
import { Box3, DataUtils, Raycaster, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { expect, it } from "vitest";
import { coast,coastSegments,shorePanels } from "./coastline.ts";
import { buildSeabed } from "./ocean/seabed.ts";
import { SKYLINE_PLOTS, TOWER_DESIGNS } from "./skyline-layout.ts";

import { CITY_PLAN, permitsStreetTree, exerciseGardenSite, reservoirSite } from "./city/city-plan.data.ts";
import { edgeCenterline, sections, walkNetwork } from "./city/street-graph.ts";

it("keeps the delivered towers inside their blocks and reserves their full width for planting", async () => {
  const bounds = await Promise.all(TOWER_DESIGNS.map(async design => {
    const file = await readFile(new URL("../../public/models/tower-" + design.id + ".glb", import.meta.url));
    const asset = await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), "");
    for(const name of ["podium","lobby","typical-floor","mechanical","crown"])expect(asset.scene.getObjectByName(name)).toBeDefined();
    return new Box3().setFromObject(asset.scene);
  }));
  for (const plot of SKYLINE_PLOTS) {
    const box = bounds[TOWER_DESIGNS.indexOf(plot.design)]!;
    expect(Math.max(-box.min.x, box.max.x)).toBeLessThanOrEqual(plot.width/2);
    expect(Math.max(-box.min.z, box.max.z)).toBeLessThanOrEqual(plot.depth/2);
    expect(plot.height/Math.min(box.max.x-box.min.x,box.max.z-box.min.z)).toBeLessThanOrEqual(4.5);
    for (const localX of [box.min.x, box.max.x]) for (const localZ of [box.min.z, box.max.z]) {
      const x = plot.x + localX*Math.cos(plot.yaw) + localZ*Math.sin(plot.yaw);
      const z = plot.z - localX*Math.sin(plot.yaw) + localZ*Math.cos(plot.yaw);
      expect(Math.abs(x-plot.x)).toBeLessThan(plot.width/2);
      expect(Math.abs(z-plot.z)).toBeLessThan(plot.depth/2);
    }
  }
});

it("exposes one roof surface above each tower floor",async()=>{
  const ray=new Raycaster(new Vector3(),new Vector3(0,-1,0),0,.205);
  for(const {id} of TOWER_DESIGNS){
    const file=await readFile(new URL("../../public/models/tower-"+id+".glb",import.meta.url));
    const {scene}=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),"");
    scene.updateMatrixWorld(true);
    for(const floor of ["lobby","podium","typical-floor","setback-floor"]){
      const part=scene.getObjectByName(floor)!;
      for(const [x,z] of [[2.31,1.37],[-5.17,4.23],[3.21,-5.63]] as const){
        ray.ray.origin.set(x,4,z);
        expect(ray.intersectObject(part),id+"/"+floor).toHaveLength(1);
      }
    }
  }
});

it("keeps all thirty parcels off roads, footways and reserved sites",()=>{
  expect(SKYLINE_PLOTS).toHaveLength(30);
  for(const [i,plot] of SKYLINE_PLOTS.entries()){
    const dx=plot.width/2,dz=plot.depth/2;
    for(const other of SKYLINE_PLOTS.slice(i+1))
      expect(Math.abs(plot.x-other.x)>=dx+other.width/2 || Math.abs(plot.z-other.z)>=dz+other.depth/2).toBe(true);
    for(const site of [reservoirSite,exerciseGardenSite]){
      expect(plot.x+dx<=site[0]![0] || plot.x-dx>=site[2]![0] || plot.z+dz<=site[0]![1] || plot.z-dz>=site[2]![1]).toBe(true);
    }
    for(const e of CITY_PLAN.edges){
      const p=edgeCenterline(CITY_PLAN,e);
      for(let j=1;j<p.length;j++){
        const [ax,az]=p[j-1]!,[bx,bz]=p[j]!,steps=Math.ceil(Math.hypot(bx-ax,bz-az)*2);
        let clearance=Infinity;
        for(let k=0;k<=steps;k++){
          const x=ax+(bx-ax)*k/steps,z=az+(bz-az)*k/steps;
          clearance=Math.min(clearance,Math.hypot(Math.max(0,Math.abs(x-plot.x)-dx),Math.max(0,Math.abs(z-plot.z)-dz)));
        }
        expect(clearance).toBeGreaterThanOrEqual(sections[e.cls].width/2-.01);
      }
    }
  }
});
it("connects the harbor, the reserve and every city junction by street",()=>{
  const visited=new Set(["freight"]),queue=["freight"];
  while(queue.length){
    const id=queue.pop()!;
    for(const e of CITY_PLAN.edges.filter(e=>e.from===id||e.to===id)){
      const next=e.from===id?e.to:e.from;
      if(!visited.has(next)){visited.add(next);queue.push(next);}
    }
  }
  expect(visited.size).toBe(CITY_PLAN.nodes.length);
  for(const [i,segment] of coastSegments.entries())expect(segment.points.at(-1)).toEqual(coastSegments[(i+1)%coastSegments.length]!.points[0]);
});

it("connects the freight quay footway to Ridge Road through marked crossings",()=>{
  const network=walkNetwork(CITY_PLAN),links=new Map<string,Set<string>>();
  const key=([x,z]:number[])=>x!.toFixed(3)+"/"+z!.toFixed(3);
  for(const path of [...network.paths.map(p=>p.points),...network.crossings.map(c=>c.path)]){
    for(let i=1;i<path.length;i++){
      const a=key(path[i-1]!),b=key(path[i]!);
      for(const [from,to] of [[a,b],[b,a]] as const){
        if(!links.has(from))links.set(from,new Set());
        links.get(from)!.add(to);
      }
    }
  }
  const queue=network.paths.filter(p=>p.edge==="gate/freight").map(p=>key(p.points.at(-1)!));
  const seen=new Set(queue);
  while(queue.length){
    for(const next of links.get(queue.pop()!)??[]){
      if(!seen.has(next)){seen.add(next);queue.push(next);}
    }
  }
  expect(network.paths.filter(p=>p.edge==="ridge-harbor/ridge-market").some(p=>p.points.every(v=>seen.has(key(v))))).toBe(true);
});

it("keeps each beach joined to its neighboring banks throughout the swash cycle",()=>{
  let joins=0;
  for(const [i,panel] of shorePanels.entries()){
    const j=(i+1)%shorePanels.length;
    if((coast[i]!.type==="beach")===(coast[j]!.type==="beach"))continue;
    joins++;
    const next=shorePanels[j]!.start;
    for(const level of ["crest","beach","waterline"] as const)expect(panel.end[level]).toEqual(next[level]);
    expect(panel.end.swash).toEqual([0,0]);
    expect(next.swash).toEqual([0,0]);
  }
  expect(joins).toBe(4);
});

it("has shallow water along the entire closed bank, including the closing segment", () => {
  const { texture, bounds, depthAt } = buildSeabed();
  try {
    const { data, width, height } = texture.image;
    expect.assert(data instanceof Uint16Array);
    for (const [i, a] of coast.entries()) {
      const sameProfile=[-3,-2,-1,1,2,3].every(step=>coast[(i+step+coast.length)%coast.length]!.type===a.type);
      if(sameProfile && a.type==="beach") expect(Math.abs(depthAt(...a.toe)-1.15)).toBeLessThan(.05);
      if(sameProfile && a.type==="revetment") expect(depthAt(...a.toe)).toBeCloseTo(4,0);
      const b = coast[(i + 1) % coast.length]!;
      const x = (a.waterline[0] + b.waterline[0])/2;
      const z = (a.waterline[1] + b.waterline[1])/2;
      const ix = Math.floor((x-bounds.x)/bounds.z*width);
      const iz = Math.floor((z-bounds.y)/bounds.w*height);
      expect(Math.abs(DataUtils.fromHalfFloat(data[(iz*width+ix)*4+1]!)) * 24).toBeLessThan(.4);
    }
  } finally { texture.dispose(); }
});

it("keeps new street trees away from tower footprints and the working quay",()=>{
  for(const plot of SKYLINE_PLOTS){
    expect(permitsStreetTree(plot.x,plot.z,2)).toBe(false);
    expect(permitsStreetTree(plot.x+plot.width/2+1,plot.z,2)).toBe(false);
  }
  expect(permitsStreetTree(-14,-44,2)).toBe(false);
});
