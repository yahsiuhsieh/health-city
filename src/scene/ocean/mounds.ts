import { coast } from "../coastline.ts";
import type { SeabedFeature } from "./seabed.ts";

// Stratify the shelf-edge band in 300 m² cells. The jitter is fixed in world space.
export function shelfMounds(): SeabedFeature[] {
  const features: SeabedFeature[] = [];
  let seed = 2166136261;
  const random = () => { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed/4294967296; };
  const step = Math.sqrt(300);
  for (let ix=-19;ix<=3;ix++) for (let iz=-9;iz<=9;iz++) {
    const x=(ix+random())*step, z=(iz+random())*step;
    let nearest=Infinity, offshore=0, width=0;
    for (const [i,a] of coast.entries()) {
      const b=coast[(i+1)%coast.length]!;
      const dx=b.waterline[0]-a.waterline[0], dz=b.waterline[1]-a.waterline[1];
      const px=x-a.waterline[0], pz=z-a.waterline[1];
      const u=Math.min(1,Math.max(0,(px*dx+pz*dz)/(dx*dx+dz*dz)));
      const d=(px-dx*u)**2+(pz-dz*u)**2;
      if (d>=nearest) continue;
      nearest=d; offshore=px*dz-pz*dx; width=a.type==="beach"?a.width:0;
    }
    const distance=Math.sqrt(nearest);
    if (offshore<=0 || width<1 || distance<33 || distance>57) continue;
    features.push({kind:"mound",x,z,radiusX:2.5+random()*3,radiusZ:1.9+random()*1.7,
      top:-(6+random()*Math.min(5,(distance-30)*.2)),yaw:random()*Math.PI});
  }
  return features;
}
