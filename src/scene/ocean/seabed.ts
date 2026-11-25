import { DataTexture, DataUtils, HalfFloatType, LinearFilter, RGBAFormat, Vector4 } from "three";
import { breakwaterArms, HARBOR_MOUTH } from "../city/harbor-plan.ts";
import { harborWorks,coast as defaultCoast } from "../coastline.ts";

import type { Point } from "../loop-path.ts";
export interface SeabedFeature {
  revealKey?: number;
  revealGradient?: readonly [number,number];
  kind: "mound" | "sandbar" | "reef";
  x: number; z: number; radiusX: number; radiusZ: number; yaw: number; top: number;
}
interface Land {
  polygon: Point[];
  shoreWidth: number;
  shoreType?: "sand" | "rock";
  revealKey?: number;
  vertexRevealKeys?: number[];
}
export interface SeabedOptions { coastline?: typeof defaultCoast; extraLand?: Land[]; features?: SeabedFeature[] }
export type SeabedData = ReturnType<typeof buildSeabed>;

const spacing = .5, margin = 80;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(n, max));

function softDepth(fromWaterline: number, fromToe: number) {
  if (fromToe < 0) {
    const width = Math.max(.01, fromWaterline-fromToe);
    const t = fromWaterline / width;
    // Ease into the shelf slope so texture filtering preserves the depth at the toe.
    return 1.15*(1-(1-t)**3) + .185*width*t*(t-1);
  }
  return 1.15 + .185*Math.min(10,fromToe) + .2*Math.max(0,fromToe-10);
}

// Each grid row crosses the polygon in pairs. Keep the interior out of the shelf mesh.
function landMask(polygon: Point[], bounds: Vector4, width: number, height: number) {
  const inside = new Uint8Array(width * height);
  for (let iz = 0; iz < height; iz++) {
    const z = bounds.y + (iz + .5) * spacing;
    const crossings: number[] = [];
    for (const [i, a] of polygon.entries()) {
      const b = polygon[(i + 1) % polygon.length]!;
      if ((a[1] > z) !== (b[1] > z)) crossings.push(a[0] + (z-a[1]) * (b[0]-a[0]) / (b[1]-a[1]));
    }
    crossings.sort((a,b) => a-b);
    for (let i = 0; i < crossings.length; i += 2) {
      const column = (x: number) => clamp(Math.ceil((x-bounds.x)/spacing - .5), 0, width);
      inside.fill(1, iz * width + column(crossings[i]!), iz * width + column(crossings[i+1]!));
    }
  }
  return inside;
}

export function buildSeabed({ coastline: coast = defaultCoast, extraLand = [], features = [] }: SeabedOptions = {}) {
  const city = coast.map(section => section.waterline);
  const extent = [...city,...(coast===defaultCoast?harborWorks.flatMap(s=>s.points):[]), ...extraLand.flatMap(land => land.polygon)];
  for (const f of features) {
    const r = Math.max(f.radiusX, f.radiusZ);
    extent.push([f.x-r,f.z-r], [f.x+r,f.z+r]);
  }
  const xs = extent.map(p => p[0]), zs = extent.map(p => p[1]);
  const left = Math.floor(Math.min(...xs)) - margin, bottom = Math.floor(Math.min(...zs)) - margin;
  const width = Math.ceil((Math.max(...xs) + margin - left) / spacing);
  const height = Math.ceil((Math.max(...zs) + margin - bottom) / spacing);
  const bounds = new Vector4(left, bottom, width * spacing, height * spacing);
  const data = new Float32Array(width * height * 4);
  for (let n = 0; n < data.length; n += 4) { data[n] = 1; data[n+1] = 1; }
  const nearest = new Float32Array(width * height);
  const owners = new Int32Array(width * height);
  const fractions = new Float32Array(width * height);

  const shoreDistance = new Float32Array(width * height).fill(margin);
  function addLand(polygon: Point[], land?: Land) {
    const inside = landMask(polygon, bounds, width, height);
    const toeInside = land ? undefined : landMask(coast.map(s=>s.toe), bounds, width, height);
    const quayDistance = new Float32Array(width*height).fill(margin*margin);
    const beachDistance = new Float32Array(width*height).fill(margin*margin);
    nearest.fill(margin * margin);
    owners.fill(-1);
    for (const [i, a] of polygon.entries()) {
      const b = polygon[(i + 1) % polygon.length]!;
      const dx = b[0]-a[0], dz = b[1]-a[1], lengthSq = dx*dx + dz*dz;
      if (!lengthSq) continue;
      const profileDistances = land ? undefined : (coast[i]!.type==="quay" || coast[i]!.type==="seawall") ? quayDistance : beachDistance;
      const minX = Math.max(0, Math.floor((Math.min(a[0],b[0])-margin-left)/spacing));
      const maxX = Math.min(width-1, Math.ceil((Math.max(a[0],b[0])+margin-left)/spacing));
      const minZ = Math.max(0, Math.floor((Math.min(a[1],b[1])-margin-bottom)/spacing));
      const maxZ = Math.min(height-1, Math.ceil((Math.max(a[1],b[1])+margin-bottom)/spacing));
      for (let iz = minZ; iz <= maxZ; iz++) {
        const pz = bottom + (iz+.5)*spacing - a[1];
        for (let ix = minX; ix <= maxX; ix++) {
          const px = left + (ix+.5)*spacing - a[0];
          const u = clamp((px*dx+pz*dz)/lengthSq, 0, 1);
          const distanceSq = (px-u*dx)**2 + (pz-u*dz)**2, n = iz*width+ix;
          if (profileDistances && distanceSq < profileDistances[n]!) profileDistances[n] = distanceSq;
          if (distanceSq >= nearest[n]!) continue;
          nearest[n] = distanceSq; owners[n] = i; fractions[n] = u;
        }
      }
    }
    for (let n = 0; n < owners.length; n++) {
      const i = owners[n]!;
      if (i < 0) continue;
      const next = (i+1) % polygon.length, u = fractions[n]!;
      const interpolate = (a: number,b: number) => a+(b-a)*u;
      const shoreWidth = land?.shoreWidth ?? interpolate(coast[i]!.width, coast[next]!.width);
      const shoreType = land ? 0 : clamp(1-shoreWidth/.8, 0, 1);
      const d = Math.sqrt(nearest[n]!);
      // Widen the transition offshore where the beach shelf meets the dredged basin.
      const spread = Math.min(15,d*.65);
      const blend = clamp(.5 + (Math.sqrt(beachDistance[n]!)-Math.sqrt(quayDistance[n]!))/(2*spread+.001),0,1);
      const hard = land ? 0 : shoreType + (blend*blend*(3-2*blend)-shoreType)*clamp((d-1.5)/5,0,1);
      const x = left+(n%width+.5)*spacing, z = bottom+(Math.floor(n/width)+.5)*spacing;
      let fromToe = d - .8*shoreWidth;
      if (toeInside && d < 9 && !inside[n]) {
        // In coves, the nearest toe and the nearest waterline can belong to different segments.
        let closest = Infinity;
        for (let offset=-3; offset<=3; offset++) {
          const j = (i+offset+coast.length)%coast.length;
          const a = coast[j]!.toe, b = coast[(j+1)%coast.length]!.toe;
          const dx = b[0]-a[0], dz = b[1]-a[1], px = x-a[0], pz = z-a[1];
          const u = clamp((px*dx+pz*dz)/Math.max(.0001,dx*dx+dz*dz),0,1);
          closest = Math.min(closest,(px-u*dx)**2+(pz-u*dz)**2);
        }
        fromToe = Math.sqrt(closest)*(toeInside[n] ? -1 : 1);
      }
      const soft = land ? d * 3 / Math.max(.5, shoreWidth) : softDepth(d, fromToe);
      const relief = .4 * Math.sin(x*.071+z*.043)*Math.cos(z*.056-x*.023) * clamp((fromToe-3)/6,0,1);
      const revetment=!land && coast[i]!.type==="revetment";
      const profileDepth = revetment ? (inside[n]?0:Math.min(4,d/1.5)+Math.max(0,d-6)*.2)
        : inside[n] ? hard*6 : (soft + (6+.2*d-soft)*hard) + relief;
      const offshoreBlend=land || inside[n]?0:clamp((d-8)/18,0,1);
      const shelfDepth=2.8+.2*d+relief;
      const depth=profileDepth+(shelfDepth-profileDepth)*offshoreBlend*(1-hard);
      const k = n*4;
      if (land && depth > data[k]! * 40) continue;
      shoreDistance[n] = d;
      data[k] = clamp(depth/40,0,1);
      data[k+1] = (inside[n] ? -1 : 1)*Math.min(1,d/24);
      data[k+2] = land?.vertexRevealKeys ? interpolate(land.vertexRevealKeys[i]!, next ? land.vertexRevealKeys[next]! : 1) : land?.revealKey ?? 0;
      data[k+3] = revetment || land?.shoreType === "rock" ? 2 : shoreType;
    }
  }
  if(city.length) addLand(city);
  if(coast===defaultCoast){
    const perimeter:Point[]=[...breakwaterArms[0],...[...breakwaterArms[1]].reverse()];
    const inside=landMask(perimeter,bounds,width,height);
    const shore=landMask(city,bounds,width,height);
    const [mx,mz]=HARBOR_MOUTH.point;
    const rockEdges=breakwaterArms.flatMap(arm=>arm.slice(1).map((end,i)=>({start:arm[i]!,end})));
    for(let iz=0;iz<height;iz++){
      const z=bottom+(iz+.5)*spacing;
      if(z < -134 || z > 108)continue;
      for(let ix=0;ix<width;ix++){
        const x=left+(ix+.5)*spacing,n=iz*width+ix;
        if(x < -25 || x > mx+24 || shore[n])continue;
        let rubbleDistance=Infinity;
        for(const {start:a,end:b} of rockEdges){
          const dx=b[0]-a[0],dz=b[1]-a[1];
          const u=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);
          rubbleDistance=Math.min(rubbleDistance,(x-a[0]-u*dx)**2+(z-a[1]-u*dz)**2);
        }
        rubbleDistance=Math.sqrt(rubbleDistance);
        const inlet=clamp(1-Math.hypot(x-mx,Math.max(0,Math.abs(z-mz)-34.4))/24,0,1);
        const mask=inside[n]?1:Math.max(inlet,clamp(1-rubbleDistance/9,0,1));
        const base=data[n*4]!*40;
        const basinDepth=7+1.8*clamp((x-mx+45)/38,0,1);
        const coastalBlend=clamp((shoreDistance[n]!-8)/8,0,1);
        const dredged=base+coastalBlend*(inside[n]?1:inlet)*(basinDepth-base);
        const toeDepth=Math.min(dredged,Math.max(.15,(rubbleDistance-1.4)*2.4));
        const depth=dredged+(toeDepth-dredged)*coastalBlend;
        data[n*4]=depth/40;
        data[n*4+2]=-mask;
        if(rubbleDistance<4)data[n*4+3]=2;
      }
    }
  }
  for (const land of extraLand) addLand(land.polygon, land);

  const rock = new Float32Array(width*height);
  for (const f of features) {
    if (f.radiusX <= 0 || f.radiusZ <= 0) continue;
    const r = Math.max(f.radiusX,f.radiusZ) + (f.top >= 0 ? 24 : 0);
    const c = Math.cos(f.yaw), s = Math.sin(f.yaw);
    const minZ = Math.max(0,Math.floor((f.z-r-bottom)/spacing)), maxZ = Math.min(height,(f.z+r-bottom)/spacing);
    const minX = Math.max(0,Math.floor((f.x-r-left)/spacing)), maxX = Math.min(width,(f.x+r-left)/spacing);
    for (let iz = minZ; iz < maxZ; iz++) for (let ix = minX; ix < maxX; ix++) {
      const x = left+(ix+.5)*spacing-f.x, z = bottom+(iz+.5)*spacing-f.z;
      const radial = Math.hypot((c*x+s*z)/f.radiusX,(c*z-s*x)/f.radiusZ);
      const n = iz*width+ix, k = n*4, base = data[k]!*40;
      if (base <= -f.top) continue;
      if (radial < 1) {
        const t = clamp((radial-.5)*2,0,1);
        data[k] = (-f.top + (base+f.top)*t*t*(3-2*t))/40;
        if (f.revealKey !== undefined) {
          const gradient=f.revealGradient;
          data[k+2] = f.revealKey + (gradient ? x*gradient[0]+z*gradient[1] : 0);
        }
        if (f.kind !== "sandbar") rock[n] = Math.max(rock[n]!,1-t);
      }
      if (f.top < 0) continue;
      // Invert the rounded shoulder to locate the waterline of an exposed feature.
      const fraction = f.top / (base+f.top);
      const edge = .75 - .5*Math.sin(Math.asin(1-2*fraction)/3);
      const metresPerRadius = radial > 0 ? Math.hypot(x,z)/radial : Math.min(f.radiusX,f.radiusZ);
      const distance = (radial-edge)*metresPerRadius;
      if (Math.abs(distance) < shoreDistance[n]!) {
        shoreDistance[n] = Math.abs(distance);
        data[k+1] = clamp(distance/24,-1,1);
        data[k+3] = f.kind === "sandbar" ? 0 : 2;
      }
    }
  }
  return packSeabed(bounds,width,height,data,rock,shoreDistance,spacing);
}

export function packSeabed(bounds:Vector4,width:number,height:number,data:Float32Array,rock:Float32Array,shoreDistance:Float32Array,spacing:number){
  const left=bounds.x,bottom=bounds.y;
  const pixels = Uint16Array.from(data, DataUtils.toHalfFloat);
  const texture = new DataTexture(pixels, width, height, RGBAFormat, HalfFloatType);
  texture.minFilter = texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  const contains = (x:number,z:number) => x>=left && z>=bottom && x<left+bounds.z && z<bottom+bounds.w;
  function sampleAt(x: number,z: number,channel: number) {
    if (!contains(x,z)) return channel===5 ? margin : channel<2 ? 1 : 0;
    const px = clamp((x-left)/spacing-.5,0,width-1), pz = clamp((z-bottom)/spacing-.5,0,height-1);
    const ix = Math.floor(px), iz = Math.floor(pz), u = px-ix, v = pz-iz;
    const a = iz*width+ix, b = iz*width+Math.min(ix+1,width-1);
    const row = Math.min(iz+1,height-1)*width-iz*width;
    const read = (n: number) => channel === 5 ? shoreDistance[n]! : channel === 4 ? rock[n]! : DataUtils.fromHalfFloat(pixels[n*4+channel]!);
    return (read(a)*(1-u)+read(b)*u)*(1-v) + (read(a+row)*(1-u)+read(b+row)*u)*v;
  }
  return { texture, bounds, contains, sampleAt, depthAt: (x: number,z: number) => sampleAt(x,z,0)*40 };
}
