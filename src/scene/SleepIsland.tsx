import { useEffect,useMemo,useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry,Color,DoubleSide,Float32BufferAttribute,Group } from "three";
import type { Replay } from "../core/replay.ts";
import { coastPoint,islandX,islandZ,radius,sailingPose,segments,voyage,wake } from "./sleep-voyage.ts";

type Point=[number,number,number];
function terrain(){
  const positions:number[]=[],colors:number[]=[],ends:number[]=[],fractions:number[]=[];
  function tri(a:Point,b:Point,c:Point,tint:string){
    const col=new Color(tint);
    for(const v of [a,b,c]){positions.push(...v);colors.push(col.r,col.g,col.b);}
  }
  function point(f:number,r:number,y:number):Point{
    const p=coastPoint(f,r);
    // Lateral shear varies the shoreline while preserving habitat area.
    return [p.x+.85*Math.sin((p.z-islandZ)*.23),y,p.z];
  }
  function cone(x:number,y:number,z:number,r:number,h:number,color:string,lean=0){
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3,b=(i+1)*Math.PI/3;
      tri([x+r*Math.cos(b),y,z+r*Math.sin(b)],[x+r*Math.cos(a),y,z+r*Math.sin(a)],[x+lean,y+h,z],color);
    }
  }
  function coralArm(x:number,y:number,z:number,dx:number,dy:number,dz:number,r:number,tint:string){
    for(let j=0;j<5;j++){
      const a=j*Math.PI*2/5,b=(j+1)*Math.PI*2/5;
      const start:Point=[x+r*Math.cos(a),y,z+r*Math.sin(a)];
      const side:Point=[x+r*Math.cos(b),y,z+r*Math.sin(b)];
      const tip:Point=[x+dx+.45*r*Math.cos(a),y+dy,z+dz+.45*r*Math.sin(a)];
      const end:Point=[x+dx+.45*r*Math.cos(b),y+dy,z+dz+.45*r*Math.sin(b)];
      tri(start,tip,end,tint);tri(start,end,side,tint);tri(tip,[x+dx,y+dy+.045,z+dz],end,tint);
    }
  }
  for(const s of segments){
    if(s.stage==="AWAKE")continue;
    const count=Math.ceil((s.to-s.from)*180);
    for(let i=0;i<count;i++){
      const a=s.from+(s.to-s.from)*i/count,b=s.from+(s.to-s.from)*(i+1)/count;
      const shelf=(f:number)=>radius*(.77+.055*Math.sin(f*Math.PI*12));
      const edge=point(a,radius,.06),next=point(b,radius,.06);
      const lo=point(a,radius+1.5,-.85),hi=point(b,radius+1.5,-.85);
      tri(lo,hi,next,"#99c1a9");tri(lo,next,edge,"#99c1a9");
      const inner=point(a,shelf(a),1.05),adj=point(b,shelf(b),1.05);
      tri(edge,next,adj,"#d7c49b");tri(edge,adj,inner,"#d7c49b");
      const tint=s.stage==="DEEP"?"#849471":s.stage==="LIGHT"?"#a3ac7d":"#b0ad88";
      tri(inner,adj,[islandX,2.5,islandZ],tint);
      const mid=(a+b)/2;
      if(s.stage==="DEEP" && i%2===0){
        for(const k of [0,1,2,3]){
          const [x,,z]=point(mid+.001*k,shelf(mid)-1-k*3.1,0);
          const h=2.3+.8*Math.cos(i*2+k)+k*.14;
          cone(x,.9,z,.27,2,"#665943");cone(x,1.7,z,1.02,h,"#42685a");cone(x,2.5,z,.76,h*.9,"#597c65");
        }
        if(i%6===0){
          const [x,,z]=point(mid,radius+7.8+.5*Math.sin(i),0);
          cone(x,-.5,z,.85,1.25,"#675c4d");cone(x,.58,z,.25,2.1,"#615745");
          cone(x,1.35,z,1.1,2.75,"#537663");
        }
      }else if(s.stage==="LIGHT"){
        for(let k=0;k<8;k++){
          const [x,,z]=point(mid+.0008*k,radius-1.1+.6*Math.sin(i+k*4),0);
          const lean=.18*Math.sin(i+k*2),h=.66+.38*Math.cos(i+k);
          tri([x-.045,.12,z],[x+.055,.12,z],[x+lean,h+.16,z+.08],"#869150");
          if(k%3===0){
            coralArm(x,.12,z,.06,h+.36,.02,.024,"#78834d");
            coralArm(x+.06,h+.45,z+.02,0,.21,0,.043,"#8b7043");
          }
        }
      }else if(s.stage==="REM" && i%2===0){
        const [x,,z]=point(mid,radius-.75,0);
        for(let k=-1;k<=1;k++){
          const dx=k*.38+.08*Math.sin(i),h=.55+.32*Math.cos(i+k);
          coralArm(x,.16,z,dx,h,.09*k,.14,"#bc7974");
          coralArm(x+dx,.15+h,z+.09*k,.15,.26,.07,.075,"#e5a28a");
          coralArm(x+dx,.15+h,z+.09*k,-.17,.32,-.05,.082,"#db8c79");
        }
        cone(x+.4,.21,z-.36,.21,.75,"#7ed8c7");
        for(const k of [-1,1]){
          const [rx,,rz]=point(mid+.004*k,radius+7.6,0);
          cone(rx,-.55,rz,.8,1.03,"#af8883");
          cone(rx,.31,rz,.16,.68,"#77b9b3",.21*k);
        }
      }
      ends.push(positions.length/3);fractions.push(b);
    }
  }
  const g=new BufferGeometry();
  g.setAttribute("position",new Float32BufferAttribute(positions,3));g.setAttribute("color",new Float32BufferAttribute(colors,3));g.computeVertexNormals();
  return {g,ends,fractions};
}
export function SleepIsland({offset,replay,onWake}:{offset:number;replay:Replay;onWake:()=>void}){
  const land=useMemo(terrain,[]),buoy=useRef<Group>(null),pier=useRef<Group>(null),ray=useRef<Group>(null);
  const wings=useRef<Group>(null);
  const marker=sailingPose(wake.from);
  const rayShape=useMemo(()=>{
    const g=new BufferGeometry();
    g.setAttribute("position",new Float32BufferAttribute([0,.14,.78,-1.28,0,-.4,0,.08,-.56,0,.14,.78,0,.08,-.56,1.28,0,-.4,0,.08,-.56,-.08,.04,-.48,.05,0,-1.65],3));
    g.computeVertexNormals();return g;
  },[]);
  useEffect(()=>()=>{land.g.dispose();rayShape.dispose()},[land,rayShape]);
  useFrame(()=>{
    const state=voyage(offset,replay.read().seconds);
    const idx=land.fractions.findIndex(f=>f>state.progress);
    land.g.setDrawRange(0,idx===-1?Infinity:land.ends[idx-1]??0);
    if(buoy.current)buoy.current.visible=state.t>=wake.start;
    if(pier.current)pier.current.visible=state.progress===1;
    if(ray.current && wings.current){
      ray.current.visible=state.stage==="REM";
      const phase=state.t/80;
      ray.current.position.set(state.x+3.4*Math.sin(state.yaw),.31+.09*Math.sin(phase),state.z+3.4*Math.cos(state.yaw));
      ray.current.rotation.y=state.yaw+Math.PI/2;
      wings.current.scale.y=1+.6*Math.sin(phase);
      wings.current.rotation.z=.12*Math.sin(phase);
    }
  });
  return <group name="Sleep island">
    <mesh geometry={land.g} receiveShadow><meshStandardMaterial vertexColors flatShading side={DoubleSide}
      onBeforeCompile={shader=>{
        shader.fragmentShader=shader.fragmentShader.replace("#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor.rgb * smoothstep(.12,.23,vColor.b-vColor.r) * .65;");
      }}/></mesh>
    <group ref={pier} position={[islandX-radius-.3,0,islandZ]}>
      <mesh position-y={.55}><boxGeometry args={[3.5,.28,2.4]}/><meshStandardMaterial color="#aa8861"/></mesh>
      {[-1,1].map(z=><mesh key={z} position={[-1.6,.18,z]}><cylinderGeometry args={[.13,.14,1.5,8]}/><meshStandardMaterial color="#755e46"/></mesh>)}
    </group>
    <group ref={buoy} name="Awakening buoy" position={[marker.x+3*Math.sin(marker.yaw),0,marker.z+3*Math.cos(marker.yaw)]} onClick={e=>{if(e.delta<=4){e.stopPropagation();onWake()}}}>
      <mesh position-y={.34}><coneGeometry args={[.52,.8,10]}/><meshStandardMaterial color="#ce7341"/></mesh>
      <mesh position-y={.97}><cylinderGeometry args={[.08,.12,.8,10]}/><meshStandardMaterial color="#f2dbac"/></mesh>
      <mesh position-y={1.45}><sphereGeometry args={[.18,10,8]}/><meshStandardMaterial color="#f9dfa3" emissive="#ffbe56" emissiveIntensity={.6}/></mesh>
    </group>
    <group ref={ray} name="Sleep ray"><mesh position-y={.07} scale={[.35,.15,.81]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#456f79"/></mesh>{[-1,1].map(side=><mesh key={side} position={[side*.18,.18,.4]}><sphereGeometry args={[.068,7,5]}/><meshStandardMaterial color="#283d41"/></mesh>)}<group ref={wings}><mesh geometry={rayShape}><meshStandardMaterial color="#426f78" side={DoubleSide}/></mesh></group></group>
  </group>;
}
