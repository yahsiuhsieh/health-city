import { DataTexture, LinearFilter, Vector4 } from "three";
import { coast } from "./coastline.ts";

// R measures distance to land. G measures progress from the waterline to deep water.
export function coastalDepth() {
  const margin = 24, spacing = .4;
  const xs = coast.map(s => s.waterline[0]), zs = coast.map(s => s.waterline[1]);
  const left = Math.floor(Math.min(...xs)) - margin, bottom = Math.floor(Math.min(...zs)) - margin;
  const width = Math.ceil((Math.max(...xs) + margin - left) / spacing);
  const height = Math.ceil((Math.max(...zs) + margin - bottom) / spacing);
  const pixels = new Uint8Array(width * height * 4).fill(255);
  const nearest = new Float32Array(width * height).fill(margin);
  for (const [i,a] of coast.entries()) {
    const b = coast[(i+1) % coast.length]!;
    const [x,z] = a.waterline, [bx,bz] = b.waterline;
    const dx = bx-x, dz = bz-z;
    const minX = Math.max(0, Math.floor((Math.min(x,bx)-margin-left)/spacing));
    const maxX = Math.min(width-1, Math.ceil((Math.max(x,bx)+margin-left)/spacing));
    const minZ = Math.max(0, Math.floor((Math.min(z,bz)-margin-bottom)/spacing));
    const maxZ = Math.min(height-1, Math.ceil((Math.max(z,bz)+margin-bottom)/spacing));
    for (let iz=minZ; iz<=maxZ; iz++) for (let ix=minX; ix<=maxX; ix++) {
      const px = left+(ix+.5)*spacing-x, pz = bottom+(iz+.5)*spacing-z;
      const u = Math.max(0,Math.min(1,(px*dx+pz*dz)/(dx*dx+dz*dz)));
      const distance = Math.hypot(px-u*dx,pz-u*dz);
      const index = iz*width+ix;
      if (distance >= nearest[index]!) continue;
      nearest[index] = distance;
      pixels[index*4] = Math.round(255*distance/margin);
      pixels[index*4+1] = Math.round(255*Math.min(1,distance/(a.shelf+(b.shelf-a.shelf)*u)));
    }
  }
  const texture = new DataTexture(pixels,width,height);
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return { texture, bounds: new Vector4(left,bottom,width*spacing,height*spacing), margin };
}
