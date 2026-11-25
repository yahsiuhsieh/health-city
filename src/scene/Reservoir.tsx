import {useEffect,useLayoutEffect,useMemo,useRef} from "react";
import {useFrame,useThree} from "@react-three/fiber";
import {BoxGeometry,BufferGeometry,CanvasTexture,Color,CylinderGeometry,DodecahedronGeometry,DoubleSide,Float32BufferAttribute,InstancedMesh,Object3D,Mesh,MeshStandardMaterial,SRGBColorSpace,Vector3} from "three";
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js";
import {reservoirLevel} from "../core/rhr.ts";
import type {Replay} from "../core/replay.ts";
import {basinGeometry,damSite,hillside,upstreamFace} from "./reservoir-basin.ts";

type Point=[number,number,number];
const intake={x:-11.5,z:-8,width:4.6,depth:6.4};

// Bake small structures into one colored mesh to keep the world overview inexpensive.
function civilWorks(){
  const pieces:BufferGeometry[]=[];
  function piece(g:BufferGeometry,color:string){
    const flat=g.index?g.toNonIndexed():g;
    if(flat!==g)g.dispose();
    flat.deleteAttribute("uv");
    const c=new Color(color),rgb:number[]=[];
    for(let i=0;i<flat.getAttribute("position").count;i++)rgb.push(c.r,c.g,c.b);
    flat.setAttribute("color",new Float32BufferAttribute(rgb,3));pieces.push(flat);
  }
  function box(x:number,y:number,z:number,w:number,h:number,d:number,color:string,yaw=0){
    piece(new BoxGeometry(w,h,d).rotateY(yaw).translate(x,y,z),color);
  }
  function pipe(a:Point,b:Point,r:number,color:string){
    const start=new Vector3(...a),end=new Vector3(...b),v=end.clone().sub(start);
    const g=new CylinderGeometry(r,r,v.length(),8);g.rotateX(Math.PI/2);g.lookAt(v.normalize());g.translate(...start.lerp(end,.5).toArray());piece(g,color);
  }
  const stone="#b7b4a7",trim="#e0dac8",steel="#415957",roof="#587069";
  // Swept concrete sections share their endpoints along the curved crest.
  function section(x0:number,x1:number,profile:number[][],color:string){
    const verts:number[]=[];
    const at=(x:number,p:number[])=>[x,p[1]!,upstreamFace(x)+p[0]!];
    const tri=(a:number[],b:number[],c:number[])=>verts.push(...a,...b,...c);
    for(let i=0;i<profile.length;i++){
      const a=profile[i]!,b=profile[(i+1)%profile.length]!;
      tri(at(x0,a),at(x1,a),at(x1,b));tri(at(x0,a),at(x1,b),at(x0,b));
      if(i>0&&i<profile.length-1){tri(at(x0,profile[0]!),at(x0,b),at(x0,a));tri(at(x1,profile[0]!),at(x1,a),at(x1,b));}
    }
    const g=new BufferGeometry();g.setAttribute("position",new Float32BufferAttribute(verts,3));g.computeVertexNormals();piece(g,color);
  }
  for(let i=0;i<28;i++){
    const x=-35+i*2.5,spill=x>=-7.5&&x<7.5;
    section(x,x+2.5,spill?[[0,0],[0,20.5],[1,20.5],[2.5,19.8],[4,17],[8,5],[10,1.6],[12,.8],[12,0]]:
      [[0,0],[0,21.6],[5.8,21.6],[6,17],[12,0]],i%4===0?"#aaa99e":stone);
    section(x,x+2.5,[[0,21.6],[0,22],[6,22],[6,21.6]],"#888d86");
    for(const z of [0,5.8])section(x,x+2.5,[[z,22],[z,22.65],[z+.22,22.65],[z+.22,22]],trim);
  }
  for(const x of [-7.5,-2.5,2.5,7.5])box(x,20.6,upstreamFace(x)+3,.65,5.8,6.4,trim);
  for(const x of [-5,0,5]){
    const z=upstreamFace(x);
    const skin=Array.from({length:9},(_,i)=>{
      const angle=(i-4)*.115;
      return [2.9-3.3*Math.cos(angle),21.9+3.3*Math.sin(angle)];
    });
    section(x-2.12,x+2.12,[...skin,...skin.slice().reverse().map(([d,h])=>[d!+.18,h!])],steel);
    for(const y of [21.1,22,22.9])box(x,y,z+.48,4.4,.12,.2,roof);
    box(x,24.4,z+2.7,3.7,2.5,2.6,stone);box(x,25.8,z+2.7,4.2,.35,3.1,roof);
    box(x,24.5,z+4.04,2.5,.8,.12,steel);
  }
  // Intake, access bridge, and guarded deck.
  const {x:ix,z:iz,width,depth}=intake;
  box(ix,12,iz,width,24,depth,stone);box(ix,24.2,iz,width+.8,.45,depth+.8,trim);
  box(ix,25.5,iz,width-.4,2.2,depth-.5,steel);box(ix,26.8,iz,width+.6,.45,depth+.5,roof);
  const landing=iz+depth/2,crest=upstreamFace(ix)+.3;
  box(ix,22.1,(landing+crest)/2,2,.4,crest-landing,stone);
  for(const x of [ix-.9,ix+.9]){
    pipe([x,23.2,landing],[x,23.2,crest],.08,steel);
    for(let i=0;i<=4;i++)box(x,22.7,landing+(crest-landing)*i/4,.1,1.1,.1,steel);
  }
  for(let x=-32;x<35;x+=8){
    const z=upstreamFace(x)+5.5;
    box(x,23.85,z,.16,3.7,.16,steel);box(x,25.7,z+.28,.55,.25,.85,steel);
  }
  box(18,3.1,17.2,9,6.2,5.4,stone);box(18,6.35,17.2,9.6,.5,5.9,roof);
  for(const x of [15,17,19,21])box(x,3.8,20,.95,2.4,.15,steel);
  pipe([18,15,upstreamFace(18)+6],[18,2,15],1.1,"#748580");
  box(0,.4,19.6,15,.4,7.5,"#6eaaaa");
  for(const x of [-7.5,7.5])box(x,.65,19.6,.55,1.3,8.4,stone);
  for(const x of [-5,-2.5,0,2.5,5])box(x,.8,20.5,.85,1.1,1.15,stone);
  // The creek reaches the north sea at the revetment below the road bridge.
  const course:Point[]=[[0,.5,23],[.8,.28,24.4],[2.4,.12,25.5],[4.6,-.75,26.5],[6.3,-1.8,27.7],[8.2,-3.10,29.2],[10.3,-4.75,31.2],[11.6,-5.28,32.8]];
  // Stone-lined channel carries the outlet through the coastal embankment.
  for(let i=1;i<course.length;i++){
    const a=course[i-1]!,b=course[i]!,dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz);
    const g=new BoxGeometry(3.5,.32,Math.hypot(len,b[1]-a[1])+.5);
    g.rotateX(-Math.atan2(b[1]-a[1],len)).rotateY(Math.atan2(dx,dz)).translate((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);
    piece(g,"#529496");
    for(const side of [-1,1]){
      const off=side*1.9;
      pipe([a[0]+off*dz/len,a[1]+.1,a[2]-off*dx/len],[b[0]+off*dz/len,b[1]+.1,b[2]-off*dx/len],.34,stone);
    }
  }
  box(0,1.4,23.9,9,.55,3.1,"#92938a");
  for(const x of [-4.2,4.2])box(x,.6,23.9,1.0,1.2,3.7,stone);
  for(const d of [-1.42,1.42]){
    pipe([-4.45,2.55,23.9+d],[4.45,2.55,23.9+d],.09,steel);
    for(let x=-4.4;x<=4.4;x+=2.2)box(x,2.03,23.9+d,.12,1.1,.12,steel);
  }
  function access(a:Point,b:Point){
    const dx=b[0]-a[0],dz=b[2]-a[2],dy=b[1]-a[1];
    const g=new BoxGeometry(3.1,.4,Math.hypot(dx,dy,dz)+.20);
    g.rotateX(-Math.atan2(dy,Math.hypot(dx,dz))).rotateY(Math.atan2(dx,dz)).translate((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);
    piece(g,"#94938a");
  }
  access([-4.5,1.4,23.9],[-9,.38,23.9]);access([-9,.38,23.9],[-14,.30,18.5]);
  access([4.5,1.4,23.9],[9,.38,23.9]);access([9,.38,23.9],[18,.3,20.6]);
  box(18,.15,17.2,10,.4,7.1,"#aaa99e");
  pipe([6,3,15.8],[6,2.8,16.6],.67,steel);
  for(let i=0;i<290;i++){
    const a=Math.PI*((i*.61803398875)%1),r=1.07+.20*((i*.41421356)%1);
    const p=hillside(a,r);if(r<1.12&&p.y<20.6)continue;
    if(Math.sin(a*11+3*r)>.38&&i%4!==0)continue;
    const h=1.6+1.5*((i*.73205)%1);
    box(p.x,p.y+.8,p.z,.28,1.7,.28,"#776a52");
    piece(new DodecahedronGeometry(h,0).scale(.78,1,.75).rotateY(i).translate(p.x,p.y+1.5+h*.45,p.z),
      ["#526f4c","#638351","#78915c"][i%3]!);
  }
  // Low rock ribs break the shoreline into small coves between strand lines.
  for(let i=0;i<130;i++){
    const a=Math.PI*((i*.6180339)%1),r=.58+.48*((i*.7548777)%1);
    if(Math.sin(a*12+3*Math.sin(r*6))<.56)continue;
    const p=hillside(a,r),size=.5+.85*((i*.371)%1);
    piece(new DodecahedronGeometry(size).scale(2.5,.32,.68).rotateY(a+.6).translate(p.x,p.y+.1,p.z),
      ["#afa38c","#cbbb9e","#978f7d"][i%3]!);
  }
  for(const x of [-30,-22,-14,12,22,30]){
    const z=upstreamFace(x);
    pipe([x,1.5,z+11.4],[x,16.9,z+6.15],.14,"#8e9189");
  }
  for(const x of [-5,0,5]){
    const z=upstreamFace(x);
    box(x,20.55,z+3,4.3,1.4,1.2,"#586c6b");
    for(const side of [-1,1])pipe([x+side*1.65,20.2,z+3.55],[x+side*1.65,23.5,z+2.1],.13,steel);
  }
  const merged=mergeGeometries(pieces)!;pieces.forEach(g=>g.dispose());return merged;
}
function gaugeTexture(anisotropy:number){
  const canvas=document.createElement("canvas");
  canvas.width=640;canvas.height=1920;
  const ctx=canvas.getContext("2d")!;
  ctx.fillStyle="#fffbea";ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#14282d";ctx.font="bold 196px sans-serif";ctx.textBaseline="alphabetic";
  // The board spans 19.2 m. A 40 px interval equals 0.4 m at the waterline.
  for(let bpm=40;bpm<=80;bpm++){
    const y=160+(80-bpm)*40;
    const major=bpm%5===0;
    ctx.fillRect(18,y-(major?8:4),major?218:95,major?16:8);
    if(bpm%10===0)ctx.fillText(String(bpm),258,y-8);
  }
  const texture=new CanvasTexture(canvas);
  texture.colorSpace=SRGBColorSpace;texture.anisotropy=anisotropy;
  return texture;
}
// Static capillary highlights. Only the low-level outlet follows the replay clock.
const shadeWater:MeshStandardMaterial["onBeforeCompile"]=shader=>{
  shader.vertexShader=shader.vertexShader.replace("#include <common>","#include <common>\nvarying vec2 basinUV;")
    .replace("#include <begin_vertex>","#include <begin_vertex>\nbasinUV=position.xz;");
  shader.fragmentShader=shader.fragmentShader.replace("#include <common>","#include <common>\nvarying vec2 basinUV;")
    .replace("#include <color_fragment>",`#include <color_fragment>
      float ripple=sin(basinUV.y*6.5+1.6*sin(basinUV.x*.7)+sin(basinUV.y*1.35));
      float rippleMask=smoothstep(.55,.98,sin(basinUV.x*1.12+basinUV.y*.49));
      diffuseColor.rgb+=vec3(.025,.041,.038)*smoothstep(.90,1.0,ripple)*rippleMask;`);
};
function CrestLighting(){
  const pools=useRef<InstancedMesh>(null),bulbs=useRef<InstancedMesh>(null);
  const glow=useMemo(()=>{
    const c=document.createElement("canvas");c.width=c.height=64;
    const ctx=c.getContext("2d")!,gradient=ctx.createRadialGradient(32,32,0,32,32,32);
    gradient.addColorStop(0,"rgba(255,213,141,.66)");gradient.addColorStop(.5,"rgba(244,189,115,.28)");gradient.addColorStop(1,"rgba(255,192,105,0)");
    ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;return t;
  },[]);
  useEffect(()=>()=>glow.dispose(),[glow]);
  useLayoutEffect(()=>{
    const pose=new Object3D();
    for(let i=0;i<9;i++){
      const x=i*8-32,z=upstreamFace(x);
      pose.position.set(x,25.56,z+5.85);pose.rotation.set(0,0,0);pose.updateMatrix();bulbs.current!.setMatrixAt(i,pose.matrix);
      pose.position.set(x,22.04,z+3.1);pose.rotation.set(-Math.PI/2,0,0);pose.updateMatrix();pools.current!.setMatrixAt(i,pose.matrix);
    }
    for(const mesh of [bulbs.current!,pools.current!]){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
  },[]);
  return <group>
    <instancedMesh ref={bulbs} args={[undefined,undefined,9]}><sphereGeometry args={[.31,8,6]}/><meshBasicMaterial color="#ffe3a6" toneMapped={false}/></instancedMesh>
    <instancedMesh ref={pools} args={[undefined,undefined,9]}><planeGeometry args={[8,5.4]}/><meshBasicMaterial map={glow} transparent depthWrite={false} toneMapped={false}/></instancedMesh>
    <mesh position={[intake.x,26.1,intake.z+(intake.depth-.5)/2+.02]}><boxGeometry args={[2.6,.72,.12]}/><meshBasicMaterial color="#ffe1a3" toneMapped={false}/></mesh>
  </group>;
}
export function Reservoir({bpm,night,replay,inspect}:{bpm:number|null;night:boolean;replay:Replay;inspect:()=>void}){
  const level=bpm===null?null:reservoirLevel(bpm);
  const gl=useThree(state=>state.gl);
  const works=useMemo(civilWorks,[]),face=useMemo(()=>gaugeTexture(Math.min(8,gl.capabilities.getMaxAnisotropy())),[gl]);
  const ground=useMemo(()=>basinGeometry(null,bpm===null),[bpm===null]);
  const surface=useMemo(()=>basinGeometry(level??20),[level]);
  const jet=useRef<Mesh>(null);
  useFrame(()=>{if(jet.current)jet.current.scale.x=1+.055*Math.sin(replay.read().seconds*1.8);});
  useEffect(()=>()=>{works.dispose();face.dispose();},[works,face]);
  useEffect(()=>()=>ground.dispose(),[ground]);useEffect(()=>()=>surface.dispose(),[surface]);
  return <group name="Ridge saddle reservoir" position={[damSite.x,damSite.y,damSite.z]} rotation-y={damSite.yaw} onClick={e=>{if(e.delta<5){e.stopPropagation();inspect();}}}>
    <mesh geometry={ground} receiveShadow><meshStandardMaterial vertexColors side={DoubleSide} roughness={.96}/></mesh>
    <mesh geometry={works} castShadow receiveShadow><meshStandardMaterial vertexColors side={DoubleSide} roughness={.84}/></mesh>
    <mesh name={level===null?"Capacity envelope":"Reservoir water"} geometry={surface}>
      {level===null?<meshBasicMaterial color="#c0ccd0" transparent opacity={.22} depthWrite={false} side={DoubleSide}/>:
        <meshStandardMaterial vertexColors onBeforeCompile={shadeWater} roughness={.34} metalness={.12} side={DoubleSide}/>}
    </mesh>
    <mesh name="Intake staff gauge" position={[intake.x+intake.width/2+.04,12,intake.z]} rotation-y={Math.PI/2}>
      <planeGeometry args={[5.8,19.2]}/>
      {level===null?<meshStandardMaterial color="#687471"/>:<meshBasicMaterial map={face} toneMapped={false}/>}
    </mesh>
    {night&&<CrestLighting/>}
    <mesh ref={jet} name="Outlet release" position={[6,1.6,17.7]} rotation-x={-.92}><cylinderGeometry args={[.30,.52,4.4,8]}/><meshStandardMaterial color="#a0c8c0"/></mesh>
  </group>;
}
