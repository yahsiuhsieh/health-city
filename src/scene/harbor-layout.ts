// Ground coordinates are metres. Y is up and positive X faces the sea.
import { roundedRoute } from "./loop-path.ts";
import type { Point } from "./loop-path.ts";
export const ROAD_Y = .48;
export const PAVING_Y = .60;
export const DOCK = { x: -4.3, z: -1.2, halfWidth: .875, halfLength: 5.55, deck: .46 };
export const streets = { coast: -20, back: -54, market: 12, side: -17, north: 33, south: -36, half: 3.35 };
const { coast, back, market, side, north, south, half } = streets;
export const crossings = [
  { x: coast, z: 5.2, alongX: true },
  { x: -27, z: market, alongX: false },
  { x: back, z: 19, alongX:true },
  { x: -70, z: market, alongX:false },
  ...[-100,-123,-146,-169].map(x=>({x,z:18.2,alongX:true})),
  ...[3,-7].map(z=>({x:-192,z,alongX:true})),
  ...[market,side].map(z=>({x:-187.4,z,alongX:false})),
  ...[-146,-123].map(x=>({x,z:-22,alongX:true})),
] as const;
export const stopLineX = crossings[1].x - 1.85;
export const marketShop = { x: -28.3, z: 20.5, frontZ: 17.1 };
export const square = { x: -34, z: 2 };
export const returnLaneZ = -10;
export const cameraSpots = {
  harbor: [-9, 2.4, -6], walk: [crossings[1].x, 1.2, market], road: [coast-5, .9, market-2],
  square: [square.x, 1.65, square.z], side: [-13, 1.3, -7],
} satisfies Record<string, [number, number, number]>;

// Each plot has a street-facing entrance. The extra plots extend inland.
export const plotWidth = 11.1, plotDepth = 10.5;
export const INLAND_SPACING = 23;
export const laneHalfWidth = 3.35;
export const inlandSouth = -62, inlandNorth = 62;
export const inlandBlocks = Array.from({ length: 6 }, (_, row) => {
  const east = back - row * INLAND_SPACING, west = east - INLAND_SPACING;
  const crossStreets = [side, market];
  return { east, west, crossStreets };
});

export function plotSite(row: number, index: number) {
  const block = inlandBlocks[row]!;

  const stagger = row % 2 ? 1 : -1;
  const z = [-49, -31, -2, 31, 49][index]! + stagger * 1.2;
  const southZ = row===0 ? [-51.6,-27.8,-39.7][index] : undefined;
  return [(block.west + block.east)/2 + stagger * .8, southZ ?? z, Math.PI/2] as const;
}

export const shops = [
  { x: marketShop.x, z: marketShop.z, w: 6.2, d: 2*(marketShop.z-marketShop.frontZ) },
  { x: -32.7, z: -4.8, w: 5.6, d: 4.7 },
  { x: -43, z: -25, w: 4.9, d: 5 },
  { x: -62, z: -8.6, w: 4.8, d: 4.4 },
];
export const workshop = { x: -12.5, z: 25.4, w: 5.4, d: 6.8 };

// The five delivered GLBs fit a 15 m by 12 m envelope, including projecting balconies.
const reserved = Array.from({ length: 30 }, (_, id) => {
  const [x,z,yaw] = plotSite(Math.floor(id/5),id%5);
  const rotated = Math.abs(Math.sin(yaw)) > .5;
  return { x,z,w: rotated ? 12 : 15, d: rotated ? 15 : 12 };
}).concat(shops.map(({x,z,w,d}) => ({ x, z:z-.5, w:w+.5, d:d+1.8 })), [workshop,{x:-42,z:24,w:6.2,d:7.8},{x:-42,z:-3,w:6.2,d:7.8},{x:-31,z:-27,w:6.2,d:7.8}]);

export function fitsTree(x: number, z: number, size: number) {
  const radius = size*1.4 + .25;
  if (x + radius > coast+half || onDiagonal(x,z,radius+2)) return false;
  if (x < back) {
    const edges = [back,...inlandBlocks.map(block => block.west)];
    const besideStreet = edges.some(cx => Math.abs(x-cx) < laneHalfWidth+2+radius);
    const acrossStreet = [inlandSouth,side,market,inlandNorth].some(cz =>
      Math.abs(z-cz) < (cz === market ? 4.5+3 : laneHalfWidth+2)+radius);
    if (besideStreet || acrossStreet) return false;
  }
  const foot = neighborhoodWalk.at(neighborhoodWalk.nearest(x,z));
  if (Math.hypot(x-foot.x,z-foot.z) < radius+1) return false;
  return reserved.every(site => Math.hypot(Math.max(0,Math.abs(x-site.x)-site.w/2),
    Math.max(0,Math.abs(z-site.z)-site.d/2)) >= radius);
}

export function groundHeight(x: number, z: number) {
  if (x >= -5.14 && x < -3 && z >= -6.75 && z <= 4.36) return DOCK.deck;
  if (x > -6 && x < -5.14) return DOCK.deck + (PAVING_Y-DOCK.deck)*(-5.14-x)/.86;
  for (const c of crossings) {
    const lateral = Math.abs(c.alongX ? z-c.z : x-c.x);
    const outward = Math.abs(c.alongX ? x-c.x : z-c.z) - half;
    if (lateral < 1.65 && outward < 1.45) return ROAD_Y + (PAVING_Y-ROAD_Y)*Math.max(0,outward)/1.45;
  }
  return PAVING_Y;
}

export const diagonal: readonly [Point,Point]=[[back,market],[inlandBlocks[0]!.west,-9]];
export function diagonalOffset(x:number,z:number){
  const [[ax,az],[bx,bz]]=diagonal,dx=bx-ax,dz=bz-az;
  return (dx*(z-az)-dz*(x-ax))/Math.hypot(dx,dz);
}
export function onDiagonal(x:number,z:number,margin=0){
  return x>=diagonal[1][0]-margin && x<=back+margin && Math.abs(diagonalOffset(x,z))<=laneHalfWidth+margin;
}
const lane = 1.65;
// Right-hand lanes follow the same junction coordinates as the paved streets.
function cityRoute(nodes: Point[]) {
  const corners = nodes.map(([x,z],i): Point => {
    const prev = nodes[(i+nodes.length-1)%nodes.length]!;
    const next = nodes[(i+1)%nodes.length]!;
    const before=Math.hypot(x-prev[0],z-prev[1]),after=Math.hypot(next[0]-x,next[1]-z);
    const ax=(x-prev[0])/before,az=(z-prev[1])/before,bx=(next[0]-x)/after,bz=(next[1]-z)/after;
    const miter=lane/(1+ax*bx+az*bz);
    return [x-miter*(az+bz),z+miter*(ax+bx)];
  });
  return roundedRoute(corners,nodes.map(([x,z]) => x >= back && z <= side ? 5.4 : 4.6));
}
const outer = inlandBlocks[5]!.west;
export const branchRoute = cityRoute([[outer,market],[coast,market],[coast,side],[outer,side]]);
export const vehicleRoutes = [
  branchRoute,
  cityRoute([[back,north],[coast,north],[coast,market],[inlandBlocks[3]!.west,market],[inlandBlocks[3]!.west,inlandNorth],[back,inlandNorth]]),
  cityRoute([[back,south],[coast,south],[coast,market],...diagonal,[inlandBlocks[0]!.west,side],[inlandBlocks[1]!.west,side],[inlandBlocks[1]!.west,inlandSouth],[back,inlandSouth]]),
  cityRoute([[outer,inlandNorth],[outer,inlandSouth],[back,inlandSouth],[back,side],[inlandBlocks[2]!.west,side],[inlandBlocks[2]!.west,inlandNorth]]),
];
export const stopDistance = branchRoute.nearest(stopLineX-2.55,market+lane);
const [quay, shop] = crossings;
export const promenadeRoute = roundedRoute([
  [-4.1,3.2],[-4.2,4],[-7.3,quay.z-.55],[-24.8,quay.z-.55],[shop.x-.55,7.2],
  [shop.x-.55,16.4],[-32.2,16.4],[-32.2,24.9],[-24.3,24.9],[-24.3,16.5],
  [shop.x+.55,16.1],[shop.x+.55,7.0],[-34.8,6.6],[-37.4,3.8],[-37.4,returnLaneZ+.4],[-24.3,returnLaneZ+.4],[-24.3,quay.z+.55],[-7.1,quay.z+.55],
  [-6.05,4.05],[-4.7,3.75],[-4.7,-5.4],[-3.87,-5.4],
],.65);
export const plazaRoute = roundedRoute([
  [-25.3,7.1],[-34,7.1],[-38.3,4.2],[-38.3,returnLaneZ],[-25.2,returnLaneZ],[-25.2,-4.5],
],1.1);


// A public walk from the pier through the market to the shared residential court.
export const neighborhoodWalk=roundedRoute([
  [-4.3,3.6],[-7.4,5.2],[-24.5,5.2],[-27,7.3],[-27,16.3],[-33,16.4],[-47,18.8],
  [-59,19],[-70,19],[-70,5.7],[-71,5.4],[-71,18.3],[-77.6,19],[-77.6,38],
  [-76.3,38],[-76.3,20],[-59,20],[-48,19.7],[-33,16.8],[-26.5,16.5],
  [-26.5,7.4],[-24.3,5.9],[-7.6,5.9],[-4.7,4.1]
],.5);

const citySpine:Point[]=[
  [-4.3,3.6],[-7.4,5.2],[-24.5,5.2],[-27,7.3],[-27,16.3],[-33,16.4],[-48,19],
  [-59,19],[-79,18.2],[-187.4,18.2],[-187.4,3],[-197.2,3],[-197.2,-7],[-187.4,-7],[-187.4,-22],[-107,-22]
];
// The outer sidewalk connects both residential sides to the mountain foot.
export const cityWalk=roundedRoute([...citySpine, ...citySpine.slice(1,-1).reverse().map(([x,z]):Point=>[x+.36,z+.36])],.55);
