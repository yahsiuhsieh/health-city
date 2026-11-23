import type { Plane } from "three";
import { DRY_LAYER, TRANSPARENT_MASK } from "./ocean/layers.ts";
import { useEffect,useMemo } from "react";
import { TorusGeometry,BoxGeometry,BufferGeometry,CanvasTexture,Color,CylinderGeometry,ExtrudeGeometry,Float32BufferAttribute,IcosahedronGeometry,Matrix4,Quaternion,Euler,Shape,SRGBColorSpace,Vector3 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Point } from "./loop-path.ts";
import { DOCK,PAVING_Y } from "./harbor-layout.ts";
import {breakwaterArms,cargoQuay} from "./city/harbor-plan.ts";
import { port } from "./port-layout.ts";
import { harborEdge } from "./coastline.ts";
type XYZ=[number,number,number];
const pierConcrete="#a7a69a";
const stone="#d5c8af",trim="#eddabb",iron="#485754",wood="#966a47";
function districtGeometry() {
  const pieces: BufferGeometry[] = [];
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
    g.setAttribute("color",new Float32BufferAttribute(colors,3));
    (lit ? windows : pieces).push(g);
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
  solid([[-14.4,-55], ...harborEdge, [-14.4,51]], -4, PAVING_Y, stone);
  solid([[-12.9,-7.1],[-5.12,-7.1],[-5.12,5.9],[-12.9,5.9]], -.42,.445,"#aca796");
  box(port.quayEdge+.085,.08,(port.southEnd+port.northEnd)/2,.05,.14,port.northEnd-port.southEnd,"#86998d");
  // Connect the boarding float to the recessed working apron.
  box(DOCK.x,.28,DOCK.z,DOCK.halfWidth*2,.36,DOCK.halfLength*2,"#b39b7b");
  box(-5.6,.41,-4.5,5.65,.15,1.58,"#af9879");
  const {edge,start,end,top}=cargoQuay;
  box(-9,top/2-2,(start+end)/2,2*(edge+9),top+4,end-start,pierConcrete);
  box(edge-.14,top+.045,(start+end)/2,.32,.09,end-start,"#c9c5b7");
  for(let z=start+3;z<end;z+=8){
    box(edge+.10,.35,z,.24,1.5,.82,"#434a49");
    if((z-start-3)%16===0)add(cylinder,[edge-.65,top+.25,z],[.42,.5,.42],iron);
  }
  for(let z=start+5;z<end;z+=30){
    for(const dz of [-.24,.24])box(edge+.16,.31,z+dz,.07,2.8,.07,iron);
    for(let y=-.9;y<top;y+=.28)box(edge+.19,y,z,.07,.05,.54,iron);
  }
  for(const dx of [-1.05,1.05])box(port.craneX+dx,top+.08,-36,.11,.16,26,"#697170");
  // Saw-cut apron slabs continue from the service entrance to the quay coping.
  function apron(left: number, right: number, near: number, far: number, y=PAVING_Y) {
    const shades = ["#aaa99b", "#b0afa0", "#b5b1a0", "#afad9d"];
    const columns = Math.ceil((right-left)/4), rows = Math.ceil((far-near)/4);
    const width = (right-left)/columns, depth = (far-near)/rows;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        box(left+(column+.5)*width, y+.005, near+(row+.5)*depth,
          width-.028, .014, depth-.028, shades[(column+row*3)%shades.length]!);
      }
    }
  }
  apron(-14.5,edge-.3,start,end,top);
  apron(-14.4, -5.48, port.northEnd, 3.13);
  // The service drive meets the raised truck apron over its full width.
  const run=4.8, rise=top-.6;
  add(unitBox,[-14.58-run/2,top-rise/2-.12,-47],[Math.hypot(run,rise),.24,6.4],pierConcrete,[0,0,Math.atan2(rise,run)]);
  apron(-14.4,-4.1,10,45.8);
  for (const z of [13.5,23.5,33.5,43.5]) {
    box(2,.29,z,12.5,.43,1.14,"#8b7963");
    for (let j=0;j<27;j++) box(-4+j*.46,.54,z,.44,.12,1.32,j%3 ? "#c3ac86":"#b79d78");
    for (const x of [-3.6,2.3,7.8]) {
      add(cylinder,[x,.03,z],[.24,1.5,.24],wood);
      box(x,.72,z,.16,.28,.18,iron);
    }
  }
  // The marina gangway leads to a single floating pontoon with finger piers.
  box(7,.41,60,38,.37,1.2,"#ae987b");
  for(let x=-9;x<26;x+=2.4)box(x,.605,60,.035,.02,1.16,"#86785f");
  for(const x of [-2.5,5.5,13.5,21.5])for(const sign of [-1,1]){
    box(x,.40,60+sign*3.2,.7,.32,5.4,"#a99274");
    add(cylinder,[x,.38,60+sign*5.6],[.20,1.5,.20],iron);
  }
  for(const arm of breakwaterArms){
    for(let j=1;j<arm.length;j++){
      const [ax,az]=arm[j-1]!,[bx,bz]=arm[j]!,dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz);
      add(unitBox,[(ax+bx)/2,-.72,(az+bz)/2],[3.5,3.1,length+.8],"#777d72",[0,yaw,0]);
      for(let k=0;k<length;k+=1.16){
        for(const side of [-1,0,1]){
          const shift=side*(1.47+.25*Math.sin(k*2)),r=.91+.24*Math.cos(k*3+j);
          add(canopy,[ax+dx*k/length+dz*shift/length,.52-Math.abs(side)*.53,az+dz*k/length-dx*shift/length],
            [r*1.35,r,r*1.46],["#888c7e","#96988b","#747d75"][(Math.floor(k)+j+side+3)%3]!,[k*.3,yaw+k*.17,0]);
        }
      }
    }
    const [x,z]=arm[arm.length-1]!;
    add(cylinder,[x,1.1,z],[3.65,.8,3.65],pierConcrete);
    add(cylinder,[x,3.5,z],[1.45,4,1.45],"#e8e1cc");
    add(cylinder,[x,4.2,z],[1.48,.94,1.48],arm===breakwaterArms[0]?"#487b65":"#ac5e4b");
    add(cylinder,[x,5.58,z],[1.85,.19,1.85],iron);
    add(cylinder,[x,6.43,z],[1.40,.18,1.40],iron);
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
  const freightColors = ["#ac5944","#385d72","#578a7d","#bc924d"];
  for (let i=0;i<2;i++) for (let j=0;j<2;j++) for (let k=0;k<(i===0?3:1);k++) {
    const x=-6.2-j*2.15, z=-61+i*6.15, y=2.58+k*1.96;
    const tint=freightColors[(i+2*j+k)%4]!;
    box(x,y,z,1.98,1.94,5.9,tint);
    for (let rib=0;rib<16;rib++) box(x,y,z-2.74+rib*.365,2.04,1.8,.055,tint);
  }
  for (const z of [-65]) {
    box(-11.6,3.58,z,5.3,3.93,8.4,"#ac927a");
    for (const side of [-1,1])
      add(unitBox,[-11.6+side*1.4,5.87,z],[2.94,.17,8.8],"#647c7a",[0,0,-side*.24]);
    for (const dz of [-2,2]) {
      box(-14.29,2.94,z+dz,.09,2.65,2.9,"#5b7171");
      for (let j=0;j<6;j++) box(-14.36,1.79+j*.43,z+dz,.06,.045,2.8,"#81918b");
    }
  }
  const submerged: BufferGeometry[] = [], dry: BufferGeometry[] = [];
  for (const piece of pieces) {
    piece.computeBoundingBox();
    (piece.boundingBox!.min.y < .15 ? submerged : dry).push(piece);
  }
  const result={fabric:mergeGeometries(dry)!,waterfront:mergeGeometries(submerged)!,windows:mergeGeometries(windows)!};
  for(const g of [...pieces,...windows,unitBox,cylinder,canopy])g.dispose();
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
  return <mesh layers-mask={TRANSPARENT_MASK} position={position} rotation-y={yaw}><planeGeometry args={[width,height]} /><meshBasicMaterial map={texture} transparent depthWrite={false}/></mesh>;
}
export function HarborBlock({night,cutout}:{night:boolean;cutout?:Plane[]}){
  const geometry=useMemo(districtGeometry,[]);
  useEffect(()=>()=>Object.values(geometry).forEach(g=>g.dispose()),[geometry]);
  return <group name="Harbor quay and piers">
    {breakwaterArms.map((arm,i)=>{
      const [x,z]=arm[arm.length-1]!,color=i===0?"#55ae80":"#d46048";
      return <mesh key={i} position={[x,6,z]}><cylinderGeometry args={[.48,.48,.7,12]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={night?1.5:.14}/></mesh>;
    })}
    <mesh geometry={geometry.waterfront} castShadow receiveShadow><meshStandardMaterial clippingPlanes={cutout??null} clipIntersection={!!cutout} clipShadows={!!cutout} vertexColors roughness={.88}/></mesh>
    <mesh layers-mask={1 << DRY_LAYER} geometry={geometry.fabric} castShadow receiveShadow><meshStandardMaterial clippingPlanes={cutout??null} clipIntersection={!!cutout} clipShadows={!!cutout} vertexColors roughness={.88}/></mesh>
    <mesh layers-mask={1 << DRY_LAYER} geometry={geometry.windows} receiveShadow><meshStandardMaterial clippingPlanes={cutout??null} clipIntersection={!!cutout} clipShadows={!!cutout} vertexColors roughness={.4} emissive={night?"#dca966":"#000000"} emissiveIntensity={.68}/></mesh>
  </group>;
}
