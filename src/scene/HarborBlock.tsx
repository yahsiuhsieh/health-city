import { useEffect, useMemo } from "react";
import { TorusGeometry, Vector2, BoxGeometry, BufferGeometry, CanvasTexture, Color, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, IcosahedronGeometry, Matrix4, Quaternion, Euler, Shape, SRGBColorSpace, Vector3 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { diagonalOffset,crossings, groundHeight, marketShop, PAVING_Y, ROAD_Y, fitsTree, inlandBlocks, inlandNorth, inlandSouth, laneHalfWidth, shops, workshop, plotSite, plotDepth, returnLaneZ, square, stopLineX, streets } from "./harbor-layout.ts";
import { streetTexture } from "./street-surfaces.ts";
import type { StreetSurface } from "./street-surfaces.ts";
import { roundedRoute } from "./loop-path.ts";
import type { Point } from "./loop-path.ts";
import { port } from "./port-layout.ts";
import { StreetLamp } from "./StreetLamp.tsx";
import { coast as coastline, harborEdge } from "./coastline.ts";
type XYZ = [number, number, number];
const stone = "#d5c8af",
  trim = "#eddabb",
  iron = "#485754",
  wood = "#966a47",
  glass = "#426368";
function districtGeometry() {
  const pieces: BufferGeometry[] = [];
  const surfaces:Record<StreetSurface,BufferGeometry[]>={brick:[],slate:[],lawn:[]};
  const windows: BufferGeometry[] = [];
  const unitBox = new BoxGeometry(),
    cylinder = new CylinderGeometry(.5, .5, 1, 10),
    canopy = new IcosahedronGeometry(1, 0);
  function add(base: BufferGeometry, position: XYZ, scale: XYZ, tint: string, rotation: XYZ = [0, 0, 0], lit = false) {
    const matrix = new Matrix4().compose(new Vector3(...position), new Quaternion().setFromEuler(new Euler(...rotation)), new Vector3(...scale));
    const g = base.index ? base.toNonIndexed() : base.clone();
    g.applyMatrix4(matrix);
    g.deleteAttribute("uv");
    const color = new Color(tint);
    const colors = new Float32Array(g.getAttribute("position").count * 3);
    for (let j = 0; j < colors.length; j += 3) color.toArray(colors, j);
    g.setAttribute("color", new Float32BufferAttribute(colors, 3));
    const kind:StreetSurface|undefined = tint===stone||tint==="#c6ac90"?"brick":tint==="#ded1b7"?"slate":["#9cb17b","#a6b492","#829869"].includes(tint)?"lawn":undefined;
    if(kind){
      const pos=g.getAttribute("position"),uv:number[]=[];
      const repeat=kind==="brick"?2.56:kind==="slate"?3.2:5;
      for(let j=0;j<pos.count;j++)uv.push(pos.getX(j)/repeat,pos.getZ(j)/repeat);
      g.setAttribute("uv",new Float32BufferAttribute(uv,2));surfaces[kind].push(g);
    }else (lit ? windows : pieces).push(g);
  }
  function box(x: number, y: number, z: number, w: number, h: number, d: number, tint: string, lit = false) {
    add(unitBox, [x, y, z], [w, h, d], tint, [0, 0, 0], lit);
  }
  function solid(outline: Point[], bottom: number, top: number, color: string) {
    const path = new Shape();
    outline.forEach(([x, z], i) => i ? path.lineTo(x, -z) : path.moveTo(x, -z));
    path.closePath();
    const g = new ExtrudeGeometry(path, {
      depth: top - bottom,
      bevelEnabled: false
    });
    add(g, [0, bottom, 0], [1, 1, 1], color, [-Math.PI / 2, 0, 0]);
    g.dispose();
  }
  const {
    coast,
    back,
    half,
    market,
    side,
    north,
    south
  } = streets;
  const crestY = ROAD_Y - .025;
  solid(coastline.map(section => section.crest), -.9, crestY, "#c6c4a6");
  const shoreBands = [
    { from: "crest", to: "beach", high: crestY, low: .22, tint: "#cecab3" },
    { from: "beach", to: "waterline", high: .22, low: -.025, tint: "#ddcfb2" },
    { from: "waterline", to: "toe", high: -.025, low: -1.15, tint: "#b5bdac" },
  ] as const;
  for (const band of shoreBands) {
    const vertices: number[] = [];
    for (const [i,a] of coastline.entries()) {
      const b = coastline[(i+1)%coastline.length]!;
      for (const [section,key,y] of [[a,band.from,band.high],[b,band.from,band.high],[a,band.to,band.low],
        [a,band.to,band.low],[b,band.from,band.high],[b,band.to,band.low]] as const) {
        const [x,z] = section[key];
        vertices.push(x,y,z);
      }
    }
    const strip = new BufferGeometry();
    strip.setAttribute("position",new Float32BufferAttribute(vertices,3));
    strip.computeVertexNormals();
    add(strip,[0,0,0],[1,1,1],band.tint);
    strip.dispose();
  }
  for (const [i,section] of coastline.entries()) {
    if (section.width < 1.5 || Math.sin(i*1.7)+Math.cos(i*.71) < .4) continue;
    const [x,z] = section.beach;
    const size = .55 + .32*Math.sin(i*2.1);
    add(canopy,[x,.21,z],[size*1.5,size*.55,size],"#c3c0aa",[.12,i,.04]);
    add(canopy,[x+.37,.19,z+.29],[size*.66,size*.34,size*.62],"#dbd1b9");
    if (i%3 === 0) add(canopy,[section.crest[0],crestY+.1,section.crest[1]],
      [.62,.28,.47],"#9eaf88",[0,i,.12]);
  }
  solid([[-14.4,-55], ...harborEdge, [-14.4,51]], crestY-.01, PAVING_Y, stone);
  solid([[-12.9,-7.1],[-5.12,-7.1],[-5.12,5.9],[-12.9,5.9]], -.42,.445,"#aca796");
  box(port.quayEdge+.085,.08,(port.southEnd+port.northEnd)/2,.05,.14,port.northEnd-port.southEnd,"#86998d");
  box((back + coast) / 2, ROAD_Y - .02, (north + south) / 2, coast - back + 2 * half, .04, north - south + 2 * half, "#575f5e");
  // The apron and the inland footways are cut down at each crossing.
  function pavement(left: number, right: number, low: number, high: number, tint: string) {
    const xs = [left, right],
      zs = [low, high];
    if (left < -6 && right > -6) xs.push(-6);
    for (const c of crossings) {
      const axis = (v: number, along: boolean) => (along ? [-half - 1.45, -half, half, half + 1.45] : [-1.8, -1.6, 1.6, 1.8]).map(k => v + k);
      xs.push(...axis(c.x, c.alongX).filter(v => v > left && v < right));
      zs.push(...axis(c.z, !c.alongX).filter(v => v > low && v < high));
    }
    // Narrow joints and a rounded return distinguish the walking surface from the carriageway.
    for (let x = left + 2.15; x < right - .1; x += 2.15) xs.push(x);
    for (let z = low + 2.15; z < high - .1; z += 2.15) zs.push(z);
    xs.sort((a, b) => a - b);
    zs.sort((a, b) => a - b);
    const vertices: number[] = [];
    const joint = tint===stone?0:.018;
    function corner(x: number, z: number): Point {
      const r = Math.min(low<=south?3.5:2.4, (right - left) / 2, (high - low) / 2);
      const cx = Math.max(left + r, Math.min(right - r, x)),
        cz = Math.max(low + r, Math.min(high - r, z));
      const dx = x - cx,
        dz = z - cz,
        scale = Math.min(1, r / Math.max(.00001, Math.hypot(dx, dz)));
      return [cx + dx * scale, cz + dz * scale];
    }
    const mortar: number[] = [];
    function tile(target: number[], left: number, right: number, low: number, high: number, lift: number) {
      if (left >= right || low >= high) return;
      const corners = [corner(left, low), corner(left, high), corner(right, high), corner(right, low)];
      for (const index of [0, 1, 2, 0, 2, 3]) {
        const [x, z] = corners[index]!;
        target.push(x, groundHeight(x, z) + lift, z);
      }
    }
    for (let i = 1; i < xs.length; i++) {
      for (let j = 1; j < zs.length; j++) {
        const a = xs[i - 1]!, b = xs[i]!, c = zs[j - 1]!, d = zs[j]!;
        tile(mortar, a, b, c, d, -.009);
        tile(vertices, a + joint, b - joint, c + joint, d - joint, .003);
      }
    }
    for (const [coordinates, color] of [[mortar, "#b6ac98"], [vertices, tint]] as const) {
      const surface = new BufferGeometry();
      surface.setAttribute("position", new Float32BufferAttribute(coordinates, 3));
      surface.computeVertexNormals();
      add(surface, [0, 0, 0], [1, 1, 1], color);
      surface.dispose();
    }
    const curb: number[] = [];
    const rim = [
      ...zs.map(z => corner(left,z)),
      ...xs.map(x => corner(x,high)),
      ...zs.slice().reverse().map(z => corner(right,z)),
      ...xs.slice().reverse().map(x => corner(x,low)),
    ];
    for (const [i,[x,z]] of rim.entries()) {
      const [nx,nz] = rim[(i+1)%rim.length]!;
      const y=groundHeight(x,z), ny=groundHeight(nx,nz);
      curb.push(x,y,z, x,ROAD_Y,z, nx,ny,nz, nx,ny,nz, x,ROAD_Y,z, nx,ROAD_Y,nz);
    }
    const face = new BufferGeometry();
    face.setAttribute("position",new Float32BufferAttribute(curb,3));
    face.computeVertexNormals();
    add(face,[0,0,0],[1,1,1],trim);
    face.dispose();
  }
  for (const [low, high] of [[south, side], [side, market], [market, north]] as const) pavement(back + half, coast - half, low + half, high - half, stone);
  // A dropped service entrance lines up with the return street and the flatbed.
  pavement(coast + half, -14.4, south - half, side - 2.7, stone);
  pavement(coast + half, -14.4, side + 4.45, north + half, stone);
  const ramp = new BufferGeometry();
  const roadEdge = coast + half, inland = -14.38, low = side - 2.7, high = side + 4.45;
  ramp.setAttribute("position", new Float32BufferAttribute([
    roadEdge,ROAD_Y,low, roadEdge,ROAD_Y,high, inland,PAVING_Y,high,
    roadEdge,ROAD_Y,low, inland,PAVING_Y,high, inland,PAVING_Y,low,
  ],3));
  ramp.computeVertexNormals();
  add(ramp,[0,0,0],[1,1,1],"#a69f8e");
  ramp.dispose();

  pavement(back + laneHalfWidth, coast + half, north + half, north + half + 2, stone);
  pavement(back + laneHalfWidth, coast + half, south - half - 2, south - half, stone);
  pavement(-12.9, -5.12, -7.1, 5.9, stone);
  // Saw-cut apron slabs continue from the service entrance to the quay coping.
  function apron(left: number, right: number, near: number, far: number) {
    const shades = ["#aaa99b", "#b0afa0", "#b5b1a0", "#afad9d"];
    const columns = Math.ceil((right-left)/4), rows = Math.ceil((far-near)/4);
    const width = (right-left)/columns, depth = (far-near)/rows;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        box(left+(column+.5)*width, PAVING_Y+.005, near+(row+.5)*depth,
          width-.028, .014, depth-.028, shades[(column+row*3)%shades.length]!);
      }
    }
  }
  apron(-14.4, port.quayEdge-.11, port.southEnd, port.northEnd);
  apron(-14.4, -5.48, port.northEnd, 3.13);
  // The widened quay road serves the warehouse doors and the flatbed yard.
  box(coast+.8,ROAD_Y-.018,-40.8,2*half+1.6,.04,17.6,"#586260");
  box(-16.25,.547,-44,1.68,.14,8.9,"#b7b4a4");
  for (const z of [-46.8,-41.5]) box(coast,ROAD_Y+.01,z,.11,.012,1.7,"#cfbd92");
  apron(-14.4,-3.55,-50.5,-22.85);
  apron(-14.4,-4.1,10,45.8);
  for (const z of [13.5,23.5,33.5,43.5]) {
    box(2,.29,z,12.5,.43,1.14,"#8b7963");
    for (let j=0;j<27;j++) box(-4+j*.46,.54,z,.44,.12,1.32,j%3 ? "#c3ac86":"#b79d78");
    for (const x of [-3.6,2.3,7.8]) {
      add(cylinder,[x,.03,z],[.24,1.5,.24],wood);
      box(x,.72,z,.16,.28,.18,iron);
    }
  }
  // Three open bays keep the unloading aisle beside the trawler clear.
  function shelter(x:number,z:number,width:number,length:number,eave:number,roof:string){
    for(const side of [-1,1]){
      for(let i=0;i<4;i++){
        const postZ=z+(i/3-.5)*(length-.5);
        box(x+side*(width/2-.22),(.6+eave)/2,postZ,.13,eave-.6,.13,iron);
        box(x+side*(width/2-.22),.69,postZ,.34,.18,.34,"#a9a79a");
        if(side===1)box(x,eave-.09,postZ,width,.14,.12,iron);
      }
      const slope=.20,centre=x+side*width/4;
      add(unitBox,[centre,eave+width*.025,z],[width*.515,.12,length],roof,[0,0,-side*slope]);
      for(let j=0;j<length/.36;j++){
        add(unitBox,[centre,eave+width*.025+.07,z-length/2+j*.36],[width*.515,.045,.045],"#839492",[0,0,-side*slope]);
      }
    }
  }
  shelter(-8.2,32,5.8,11.6,3.35,"#607977");
  shelter(-10,-3.5,3.45,4.6,2.85,"#7d8d88");
  const hoop=new TorusGeometry(1,.16,6,20);
  function ring(x:number,y:number,z:number,r:number,color:string,rotation:XYZ){
    add(hoop,[x,y,z],[r,r,r],color,rotation);
  }
  // Fish boxes are hollow at the top and stack on the landward side.
  for(let i=0;i<8;i++){
    const x=-10+(i%2)*.92,z=28.5+Math.floor(i/2)*.77;
    box(x,.69,z,.88,.12,.71,wood);
    for(const side of [-1,1]){
      box(x+side*.415,.89,z,.065,.34,.7,"#557d78");
      box(x,.89,z+side*.32,.82,.34,.06,"#6f9486");
    }
  }
  for(const z of [32.2,34.3])box(-10.1,1.46,z,.10,1.72,.10,iron);
  box(-10.1,2.28,33.25,.12,.1,2.3,wood);
  for(let i=0;i<17;i++){
    const z=32.24+i*.124;
    add(canopy,[-10,1.76,z],[.19,.5+.13*Math.sin(i/3),.12],i%4?"#526e56":"#956846");
  }
  box(-7.2,1.02,27.9,1.5,.14,.85,wood);
  for(const dx of [-.52,.52]) for(const dz of [-.39,.39])
    add(cylinder,[-7.2+dx,.81,27.9+dz],[.37,.13,.37],iron,[Math.PI/2,0,0]);
  box(-7.92,1.31,27.9,.09,.68,.85,iron);
  box(-5.65,1.15,14.2,.46,1.05,.36,"#d3d2bc");
  for(let i=0;i<3;i++)ring(-6.8,.69+.065*i,14.1,.42,"#ac875b",[Math.PI/2,0,0]);
  box(-8.9,1.18,39.2,1.9,1.16,.83,"#517477");
  for(const z of [13.5,23.5,33.5,43.5])for(const x of [0,4,7])
    ring(x,.28,z+.66,.34,"#414e4d",[0,0,0]);
  for(const z of [-4.8,.8])ring(-3.38,.18,z,.38,"#404b49",[0,Math.PI/2,0]);
  ring(-5.8,1.65,-4,.34,"#c95b39",[0,Math.PI/2,0]);box(-5.8,1.1,-4,.09,1.4,.09,iron);
  for(const z of [-3,-2.5])box(-3.42,.11,z,.07,1.3,.07,iron);
  for(let i=0;i<5;i++)box(-3.42,-.42+i*.25,-2.75,.08,.06,.55,iron);
  hoop.dispose();
  for(const z of [-47.5,-40.3]){
    box(-16.2,1.03,z,.21,.86,.21,"#c39b4e");
    box(-15.65,3.95,z,.28,.18,.46,trim,true);
  }
  for(const x of [-41,-37,-33])for(const z of [-46.2,-42.4]){
    for(const dz of [-.55,0,.55])box(x,.73,z+dz,2.1,.22,.17,wood);
    for(let j=0;j<7;j++)box(x-.9+j*.30,.89,z,.24,.12,1.55,"#ae895e");
    box(x,1.5,z,1.8,1.12,1.28,"#9e805c");
    for(const dx of [-.55,.55])box(x+dx,2.07,z,.065,.025,1.30,iron);
    for(const side of [-1,1]){
      box(x+side*1.3,.62,z-.95,.09,.025,.55,"#d6bd7f");
      box(x+side*1.08,.62,z-1.2,.52,.025,.09,"#d6bd7f");
    }
  }
  for(const x of [-21.2,-19.5])box(x,.486,-44,.25,.008,8,"#5e645f");
  box(-17.05,.624,-44,.21,.012,7.2,iron);
  for(let i=0;i<28;i++)box(-17.05,.633,-47.4+i*.25,.22,.009,.04,"#899088");
  const freightColors = ["#ac5944","#385d72","#578a7d","#bc924d"];
  for (let i=0;i<2;i++) for (let j=0;j<2;j++) for (let k=0;k<(i===0?3:1);k++) {
    const x=-6.2-j*2.15, z=-47+i*6.15, y=1.58+k*1.96;
    const tint=freightColors[(i+2*j+k)%4]!;
    box(x,y,z,1.98,1.94,5.9,tint);
    for (let rib=0;rib<16;rib++) box(x,y,z-2.74+rib*.365,2.04,1.8,.055,tint);
  }
  for (const z of [-44]) {
    box(-12.8,2.58,z,5.3,3.93,8.4,"#ac927a");
    for (const side of [-1,1])
      add(unitBox,[-12.8+side*1.4,4.87,z],[2.94,.17,8.8],"#647c7a",[0,0,-side*.24]);
    for (const dz of [-2,2]) {
      box(-15.49,1.94,z+dz,.09,2.65,2.9,"#5b7171");
      for (let j=0;j<6;j++) box(-15.56,.79+j*.43,z+dz,.06,.045,2.8,"#81918b");
    }
  }
  for (const c of crossings) {
    for (let k = -3; k <= 3; k++) {
      const t = k * .88;
      box(c.x + (c.alongX ? t : 0), ROAD_Y + .009, c.z + (c.alongX ? 0 : t), c.alongX ? .48 : 2.6, .014, c.alongX ? 2.6 : .48, "#e4e1c9");
    }
  }
  box(stopLineX, ROAD_Y + .012, market + half / 2, .23, .018, half - .25, "#efe9d2");
  for (const x of [coast, back]) for (let z = south + 6; z <= north - 5; z += 6) {
    if ([market, side, ...crossings.map(c => c.z)].some(v => Math.abs(v - z) < 4.6)) continue;
    box(x, ROAD_Y + .008, z, .095, .011, 2.1, "#d9ca9f");
  }
  // One continuous road bed with raised blocks leaves every intersection open.
  const westEdge = inlandBlocks[inlandBlocks.length-1]!.west-laneHalfWidth;
  const eastEdge = back-half;
  box((westEdge+eastEdge)/2, ROAD_Y-.02,(inlandSouth+inlandNorth)/2,
    eastEdge-westEdge,.04,inlandNorth-inlandSouth+2*laneHalfWidth,"#575f5e");
  for (const [low, high] of [[inlandSouth-laneHalfWidth,south-half],[north+half,inlandNorth+laneHalfWidth]] as const) {
    box(back-half+(half+laneHalfWidth)/2, ROAD_Y-.02, (low+high)/2,
      half+laneHalfWidth, .04, high-low, "#575f5e");
  }
  function parcel(points:Point[],bottom:number,top:number,color:string,radius:number) {
    if(points.length<3)return;
    const ring=roundedRoute(points,radius);
    const border=Array.from({length:Math.ceil(ring.length/.45)},(_,i):Point=>{
      const p=ring.at(i*ring.length/Math.ceil(ring.length/.45));return [p.x,p.z];
    });
    const shape=new Shape(border.map(([x,z])=>new Vector2(x,-z)));
    const g=new ExtrudeGeometry(shape,{depth:top-bottom,bevelEnabled:false});
    g.rotateX(-Math.PI/2);g.translate(0,bottom,0);
    const pos=g.getAttribute("position");
    for(let i=0;i<pos.count;i++){
      if(pos.getY(i)>bottom+.001)pos.setY(i,Math.max(bottom+.001,top+groundHeight(pos.getX(i),pos.getZ(i))-PAVING_Y));
    }
    g.computeVertexNormals();add(g,[0,0,0],[1,1,1],color);g.dispose();
  }
  function clipped(points:Point[],side:number,edge:number) {
    if(!side)return points;
    const result:Point[]=[];
    for(const [i,a] of points.entries()){
      const b=points[(i+1)%points.length]!;
      const da=diagonalOffset(...a)*side-edge,db=diagonalOffset(...b)*side-edge;
      if(da>=0)result.push(a);
      if((da>=0)!==(db>=0)){
        const t=da/(da-db);result.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
      }
    }
    return result;
  }
  const boundaries=[inlandSouth,side,market,inlandNorth];
  for(const [row,block] of inlandBlocks.entries())for(let j=0;j<3;j++){
    const merged=(row===0&&j===2)||(row===4&&j===0);
    if((row===1&&j===2)||(row===5&&j===0))continue;
    const west=(merged?inlandBlocks[row+1]!:block).west;
    const left=west+laneHalfWidth,right=block.east-laneHalfWidth;
    const low=boundaries[j]!+(j===2?4.5:laneHalfWidth),high=boundaries[j+1]!-(j===1?4.5:laneHalfWidth);
    const rect=(l:number,r:number,a:number,b:number):Point[]=>[[l,a],[l,b],[r,b],[r,a]];
    for(const cut of row===0&&j===1?[-1,1]:[0]){
      parcel(clipped(rect(left,right,low,high),cut,laneHalfWidth),ROAD_Y-.01,PAVING_Y,"#ded1b7",2.7);
      const split=merged?block.west:undefined;
      const gardens=split===undefined?[[left+2,right-2]]:[[left+2,split-2],[split+2,right-2]];
      for(const [l,r] of gardens){
        if(cut===-1)continue; // Pave the small triangular square to its full width.
        parcel(clipped(rect(l!,r!,low+(j===2?3:2),high-(j===1?3:2)),cut,laneHalfWidth+2),
          PAVING_Y-.012,PAVING_Y+.01,"#a6b492",1.6);
      }
      if(merged){
        box(block.west,.613,(low+high)/2,3.2,.018,high-low-2,"#c6ac90");
      }
    }
    for(let z=low+4;z<high-3;z+=6)box(west,ROAD_Y+.008,z,.10,.012,1.8,"#cfbf9f");
  }
  pavement(-198.8,-195.35,-9.2,5.2,"#ded1b7");
  for(let i=0;i<34;i++){
    const z=-53+i*3.15;
    if(z>-11 && z<7)continue;
    const x=-196.8-1.4*Math.sin(i*2.1);
    add(canopy,[x,.65,z],[.78,.36,1.05],i%4?"#758563":"#a8a694",[.1,i,.05]);
  }
  for(const [row,b] of inlandBlocks.entries())for(const z of [-56,56]){
    const x=(b.east+b.west)/2;
    if(Array.from({length:5},(_,i)=>plotSite(row,i)).some(site=>Math.abs(site[1]-z)<6.5))continue;
    box(x,.65,z,6,.10,1.05,"#aa8e73");
    box(x,.71,z,5.8,.06,.86,"#8a7b63");
    for(let i=-2;i<=2;i++)add(canopy,[x+i,.92,z],[.62,.39,.43],(i+row)%2?"#738760":"#859575");
  }
  bench(-71.5,2.75);
  // The warehouse forecourt meets the cargo road along its full eastern edge.
  pavement(-44,-24,-47.8,-40,"#a29f91");
  box(-24.2,ROAD_Y+.005,-45,9.7,.03,6.1,"#777c77");
  for (let id=0;id<30;id++) {
    const row = Math.floor(id/5);
    const [x,z] = plotSite(row,id%5);
    const block = inlandBlocks[row]!;
    if(x>back)continue;
    const end = block.east-(row === 0 ? half : laneHalfWidth);
    const start = x+plotDepth/2-.12;
    box((start+end)/2,.616,z,end-start,.012,1.75,stone);
  }
  function tree(x: number, z: number, size: number, variation: number) {
    if (!fitsTree(x,z,size)) return;
    box(x, .635, z, size * 1.15, .08, size * 1.15, "#8e9179");
    add(cylinder, [x, .62 + size * .77, z], [size * .17, size * 1.54, size * .17], wood);
    for (const sign of [-1, 1]) add(cylinder, [x + sign * size * .19, .62 + size * 1.44, z], [size * .09, size * .83, size * .09], wood, [0, 0, -sign * .65]);
    const leaves = ["#728853", "#92a466", "#657e52", "#a0ac68"];
    for (const [j, [dx, dy, dz]] of [[-.42, 1.78, .11], [.43, 1.81, -.16], [-.1, 2.12, -.17], [.14, 1.99, .35]].entries()) add(canopy, [x + dx! * size, .62 + dy! * size, z + dz! * size], [size * .87, size * .55, size * .76], leaves[(variation + j) % 4]!, [.13, j * .74, .15]);
  }
  function bench(x: number, z: number) {
    for (const dx of [-.64, .64]) box(x + dx, .82, z, .12, .43, .49, iron);
    for (const dz of [-.16, 0, .16]) box(x, 1.065, z + dz, 1.85, .075, .12, wood);
    box(x, 1.34, z - .24, 1.85, .24, .08, wood);
  }
  // Continuous bands of brick pick out the return alley and the shaded square.
  box(-36, .609, returnLaneZ, 23, .012, 2.1, "#bda68a");
  box(-35.2, .611, 2.4, 8.2, .012, 7.6, "#c8b094");
  for (let i = 0; i < 7; i++) box(-35.2, .621, -.5 + i * .96, 8.1, .012, .026, "#bda589");
  // The public waterfront opens onto the park boulevard.
  for (const z of [-2.6,1.4]) {
    box(-9.6,.64,z,3.8,.10,1.3,"#b3a689");
    box(-9.6,.73,z,3.52,.12,1.03,"#829869");
    bench(-12.4,z);
  }
  for (const [x,z,w,d] of [[-47,1.35,6.4,11],[-46.8,-12.5,6.8,4.4],[-33,27.6,6.2,3.2]] as const) {
    box(x,.638,z,w,.09,d,"#9cb17b");
    box(x,.699,z,w*.88,.035,.84,"#dac9a3");
    bench(x,z+d*.34);
  }
  tree(square.x, square.z, 2.45, 0);
  bench(square.x + 1.6, square.z - 2);

  bench(-10.9, 9.2);
  for (const [i, [x, z]] of [[-43, 6], [-46, 24], [-33, -9], [-60, -24], [-60, 29], [-28, -29], [-48, -23]].entries()) tree(x!, z!, 1.5 + i % 3 * .22, i);
  for (const [row,block] of inlandBlocks.entries()) {
    const lines = [inlandSouth,...block.crossStreets,inlandNorth];
    for (let j=1;j<lines.length;j++) {
      const x = (block.east+block.west)/2;
      for (let z=lines[j-1]!+5;z<lines[j]!-4;z+=3.8) {
        tree(x-1.8,z,1.15+.18*Math.sin(z+row),row+j);
      }
    }
  }
  function shop({x,z,w,d}: typeof shops[number], h: number, wall: string, awning: string) {
    const front = z - d / 2;
    box(x, PAVING_Y + h / 2, z, w, h, d, wall);
    box(x, PAVING_Y + h, z, w + .32, .24, d + .32, trim);
    box(x, PAVING_Y + h + .17, z, w - .5, .12, d - .5, "#877c69");
    box(x, PAVING_Y + 1.18, front - .04, w - .64, 2.12, .14, glass, true);
    for (const dx of [-.36, 0, .36]) box(x + dx * w, 1.66, front - .13, .10, 2.05, .12, wood);
    box(x + .22 * w, 1.63, front - .16, .93, 2.04, .12, wood);
    box(x + .22 * w, 1.89, front - .24, .71, 1.31, .05, glass, true);
    for (let j = 0; j < 9; j++) {
      add(unitBox, [x + (j - 4) * w / 9, 3.04, front - .56], [w / 9 + .003, .09, 1.11], j % 2 ? trim : awning, [-.15, 0, 0]);
      box(x + (j - 4) * w / 9, 2.87, front - 1.11, w / 9, .21, .06, j % 2 ? trim : awning);
    }
    for (const dx of [-.29, 0, .29]) {
      box(x + dx * w, 4.25, front - .06, .94, 1.16, .14, trim);
      box(x + dx * w, 4.25, front - .15, .74, .94, .06, glass, true);
    }
    box(x, 1.65, z + d / 2 + .04, .94, 2.1, .12, "#676b5a");
    box(x, PAVING_Y + .19, z, w + .12, .32, d + .12, "#a99b87");
    for (const side of [-1, 1]) {
      const wallX = x + side * (w / 2 + .04);
      box(wallX, 2.98, z, .12, .15, d, "#e0c8a6");
      for (const dz of [-.25, .18]) for (const y of [1.75, 4.18]) {
        box(wallX, y, z + dz * d, .15, 1.22, 1.14, trim);
        box(wallX + side * .087, y, z + dz * d, .05, 1.05, .91, glass, true);
        box(wallX + side * .12, y, z + dz * d, .04, 1.07, .055, wood);
        box(wallX + side * .11, y - .65, z + dz * d, .26, .10, 1.27, trim);
      }
      box(wallX, 2.76, z + d * .45, .11, 4.38, .11, "#736e60");
    }
    box(x - .19 * w, h + .95, z + .2 * d, 1.27, .52, 1.02, "#999488");
    for (let i = 0; i < 5; i++) box(x - .19 * w, h + 1.225, z + .2 * d + (i - 2) * .15, 1, .035, .055, iron);
    box(x + .31 * w, h + 1.13, z + .3 * d, .48, 1.17, .55, wall);
    box(x + .31 * w, h + 1.74, z + .3 * d, .62, .13, .69, trim);
  }
  shop(shops[0]!, 5.1, "#bb8869", "#778663");
  shop(shops[1]!, 4.95, "#cba583", "#a8654c");
  for (const [x,z,h,tint] of [[-42,24,6.5,"#c19c81"],[-42,-3,4.6,"#aab49e"],[-31,-27,5.8,"#cfaa90"]] as const)
    shop({x,z,w:5.6,d:5.3},h,tint,"#607e79");
  // A low harbor workshop with a pitched standing-seam roof and sliding doors.
  const { x: shedX, z: shedZ } = workshop;
  box(shedX, 2.13, shedZ, 4.65, 3.05, 6.4, "#bdac89");
  for (const side of [-1, 1]) {
    add(unitBox, [shedX + side * 1.24, 4.02, shedZ], [2.67, .15, 6.65], "#697d79", [0, 0, -side * .29]);
    box(shedX + side * .82, 1.81, shedZ - 3.25, 1.58, 2.38, .12, "#48706a");
    for (let k = 0; k < 3; k++) box(shedX + side * 2.35, 2.35, shedZ + 1.7 * (k - 1), .10, .88, 1.16, glass, true);
  }
  box(shedX, 3.08, shedZ - 3.29, 3.9, .11, .18, iron);
  shop(shops[2]!, 4.8, "#c4ad90", "#597877");
  const cornerShop = shops[3]!;
  shop(cornerShop, 4.85, "#c5a691", "#718877");
  box(cornerShop.x+cornerShop.w*.22,.616,-12.1,1.65,.012,2.8,stone);
  for (let i = 0; i < 3; i++) {
    const x = marketShop.x - shops[0]!.w/2 - .65,
      z = marketShop.z - 1.4 + i * .83;
    box(x, 1.04, z, .74, .78, .49, wood);
    box(x, 1.46, z, .79, .11, .54, "#bc9364");
    for (let j = 0; j < 4; j++) add(canopy, [x + (j % 2 - .5) * .27, 1.57, z + (Math.floor(j / 2) - .5) * .21], [.15, .13, .14], ["#869958", "#c98743", "#ae6250"][i]!);
  }
  for (const [dx, dz] of [[-1.6, 0], [-.8, .12], [-1.5, .55]]) {
    const x = marketShop.x + dx!,
      z = marketShop.z + 3.9 + dz!;
    box(x, .84, z, .64, .47, .49, wood);
    box(x, .94, z, .66, .07, .50, "#c49c6d");
  }
  add(cylinder, [stopLineX, 1.66, market + half + .13], [.075, 2.22, .075], iron);
  for(const block of inlandBlocks) for(const z of [18.6,-22.8,55]){
    const x=block.east-7;
    add(cylinder,[x,2.3,z],[.13,3.45,.13],iron);
    box(x,4.02,z+.38,.12,.11,.86,iron);box(x,3.96,z+.76,.38,.12,.54,trim,true);
  }
  // Octagonal rim and enamel face perpendicular to the outgoing lane.
  const sign = new CylinderGeometry(.46, .46, .066, 8, 1, false, Math.PI / 8);
  add(sign, [stopLineX, 2.81, market + half + .13], [1, 1, 1], trim, [0, 0, Math.PI / 2]);
  for (const offset of [-.041,.041]) add(sign, [stopLineX + offset, 2.81, market + half + .13], [.94, .42, .94], "#a13e32", [0, 0, Math.PI / 2]);
  sign.dispose();
  const result = {
    layers: (Object.keys(surfaces) as StreetSurface[]).map(kind=>({geometry:mergeGeometries(surfaces[kind])!,map:streetTexture(kind)})),
    fabric: mergeGeometries(pieces)!,
    windows: mergeGeometries(windows)!
  };
  for (const g of [...pieces, ...windows,...Object.values(surfaces).flat(), unitBox, cylinder, canopy]) g.dispose();
  return result;
}

export function SignText({text,position,yaw,width,height}:{text:string;position:XYZ;yaw:number;width:number;height:number}) {
  const texture=useMemo(()=>{
    const canvas=document.createElement("canvas");canvas.width=256;canvas.height=64;
    const ctx=canvas.getContext("2d")!;
    ctx.font="bold 50px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#fff3da";
    ctx.fillText(text,128,34,246);
    const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;return map;
  },[text]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh position={position} rotation-y={yaw}><planeGeometry args={[width,height]} /><meshBasicMaterial map={texture} transparent depthWrite={false}/></mesh>;
}

export function HarborBlock({night}:{night:boolean}) {
  const geometry=useMemo(districtGeometry,[]);
  useEffect(()=>()=>{geometry.layers.forEach(l=>{l.geometry.dispose();l.map.dispose()});geometry.fabric.dispose();geometry.windows.dispose();},[geometry]);
  return <group name="Harbor neighborhood">
    {geometry.layers.map(l=><mesh key={l.map.uuid} geometry={l.geometry} receiveShadow><meshStandardMaterial map={l.map} roughness={.94}/></mesh>)}
    <mesh geometry={geometry.fabric} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.88}/></mesh>
    <mesh geometry={geometry.windows} receiveShadow><meshStandardMaterial vertexColors roughness={.4} emissive={night?"#dca966":"#000000"} emissiveIntensity={.68}/></mesh>
    <SignText text="STOP" position={[stopLineX-.07,2.81,streets.market+streets.half+.13]} yaw={-Math.PI/2} width={.76} height={.26}/>
    <SignText text="HARBOR MARKET" position={[marketShop.x,3.46,marketShop.frontZ-.09]} yaw={Math.PI} width={3.75} height={.53}/>
    <StreetLamp position={[crossings[1].x+1.85,PAVING_Y,streets.market+4.1]} toward={Math.PI} night={night}/>
    <StreetLamp position={[streets.coast+4.1,PAVING_Y,crossings[0].z-2]} toward={-Math.PI/2} night={night}/>
    <StreetLamp position={[square.x+2.7,PAVING_Y,square.z+2.6]} toward={-.8} night={night}/>
  </group>;
}
