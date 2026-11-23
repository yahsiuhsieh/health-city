import {expect,it} from "vitest";
import {towerSites} from "./city-plan.data.ts";
import {towerGardens} from "./tower-gardens.ts";

it("adds entrance walks only to occupied towers and keeps public benches clear of all HRV plots",()=>{
  const empty=towerGardens(0),all=towerGardens(towerSites.length),unknown=towerGardens(null);
  expect(empty.paths).toHaveLength(0);
  expect(unknown.paths).toHaveLength(0);
  expect(all.paths).toHaveLength(towerSites.length);
  expect(all.items).toEqual(empty.items);
  expect(unknown.items).toEqual(empty.items);
  for(const item of empty.items)for(const site of towerSites)
    expect(Math.abs(item.at[0]-site.x)>=site.width/2 || Math.abs(item.at[2]-site.z)>=site.depth/2).toBe(true);
  for(const [id,[a,b]] of all.paths.entries()){
    const dx=b![0]-a![0],dz=b![1]-a![1],len=dx*dx+dz*dz;
    for(const site of towerSites.filter(s=>s.id!==id)){
      const u=Math.max(0,Math.min(1,((site.x-a![0])*dx+(site.z-a![1])*dz)/len));
      expect(Math.hypot(a![0]+u*dx-site.x,a![1]+u*dz-site.z)).toBeGreaterThan(6);
    }
  }
});
