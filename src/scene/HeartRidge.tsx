import { useEffect,useLayoutEffect,useMemo,useRef } from "react";
import { useFrame,useLoader } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { BufferGeometry,Color,DoubleSide,Float32BufferAttribute,Group,Vector3,Mesh,MeshBasicMaterial,Raycaster,InstancedMesh,Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { ReplayDay } from "../core/representative-day.ts";
import type { Replay } from "../core/replay.ts";
import { ridgeFootX } from "./city/ridge-foot.ts";
import { surfaceHeight } from "./city/terrain.ts";
import { ridgeLength,ridgeProfile } from "./ridge-profile.ts";
import { SignText } from "./HarborBlock.tsx";

type Profile=ReturnType<typeof ridgeProfile>;
function ridgeMesh(profile:Profile,n:number){
  const positions:number[]=[],colors:number[]=[];
  function section(u:number,sample:number,valid:boolean){
    const {x,y}=profile.track(sample),crest=profile.x(u),end=profile.z(u);
    const h=valid?profile.height(sample):5;
    const rail=valid?y:3;
    const roll=Math.sin(17*u)+.6*Math.cos(42*u),rock=Math.cos(29*u);
    const toe=ridgeFootX(end), grade=surfaceHeight(toe,end), rise=rail-grade;
    const bank=toe-(toe-x)*.35, shoulder=toe-(toe-x)*.70;
    const back=-256;
    return [[toe,grade-.04,end],[bank,grade+.14*rise,end],[shoulder,grade+(.48+.04*roll)*rise,end],[x+1.25,rail-.10,end],
      [x-1.25,rail-.10,end],[crest+4+rock,h*(.78+.05*roll),end],[crest,h,end],
      [crest+(back-crest)*.34,h*(.79+.04*rock),end],[crest+(back-crest)*.74,4+rock,end],[back,.45,end]];
  }
  const palette=["#a6b18a","#91a178","#7c936e","#9b927e","#7e946e","#899779","#8f9582","#758a72","#a4aa8a"];
  for(const r of profile.ranges){
    const start=r.start/n,end=r.end/n;
    let prev=section(start,start,r.valid);
    for(let k=r.start*2+1;k<=r.end*2;k++){
      const u=k/(2*n),next=section(u,Math.min(u,end-1e-9),r.valid);
      for(let j=0;j<palette.length;j++){
        const color=new Color(palette[j]!).multiplyScalar(.99+.022*Math.sin(k*.11+j));
        for(const p of [prev[j],next[j],prev[j+1],prev[j+1],next[j],next[j+1]]){
          positions.push(...p!);colors.push(color.r,color.g,color.b);
        }
      }
      prev=next;
    }
    for(const [u,sample] of [[start,start],[end,end-1e-9]] as const){
      const line=section(u,sample,r.valid),color=new Color("#8d9181");
      for(let i=1;i<line.length;i++){
        const a=line[i-1]!,b=line[i]!,c=[a[0]!,.44,a[2]!],d=[b[0]!,.44,b[2]!];
        for(const p of [a,b,c,c,b,d]){positions.push(...p);colors.push(color.r,color.g,color.b)}
      }
    }
  }
  for(const u of [0,1]){
    const edge=section(u,u===0?0:1-1e-9,profile.ranges[u===0?0:profile.ranges.length-1]!.valid);
    for(let i=1;i<edge.length;i++){
      const a=edge[i-1]!,b=edge[i]!;
      const tip=[profile.x(u),.46,(u===0?1:-1)*81];
      for(const p of [a,b,tip]){positions.push(...p);const c=new Color(palette[i-1]);colors.push(c.r,c.g,c.b)}
    }
  }
  const g=new BufferGeometry();g.setAttribute("position",new Float32BufferAttribute(positions,3));
  g.setAttribute("color",new Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
function rails(profile:Profile,n:number){
  const vertices:number[]=[];
  for(const r of profile.ranges.filter(r=>r.valid)){
    for(let k=r.start*2;k<r.end*2;k++){
      const a=profile.track(k/(2*n)),b=profile.track(Math.min((k+1)/(2*n),r.end/n-1e-9));
      for(const dx of [-.46,.46])vertices.push(a.x+dx,a.y,a.z,b.x+dx,b.y,b.z);
      if(k%4===0)vertices.push(a.x-.74,a.y-.03,a.z,a.x+.74,a.y-.03,a.z);
    }
  }
  const g=new BufferGeometry();g.setAttribute("position",new Float32BufferAttribute(vertices,3));return g;
}
function tunnelMesh(profile:Profile,start:number,end:number){
  const vertices:number[]=[],colors:number[]=[];
  function triangle(a:Vector3,b:Vector3,c:Vector3,tint:string){
    const color=new Color(tint);
    for(const point of [a,b,c]){vertices.push(point.x,point.y,point.z);colors.push(color.r,color.g,color.b);}
  }
  function section(u:number,outer:boolean,lip:boolean){
    const p=profile.track(u),next=profile.track(u+.00001);
    const side=new Vector3(p.z-next.z,0,next.x-p.x).normalize();
    const apron=Math.min(1,Math.max(0,Math.min(u-start,end-u)*ridgeLength/3));
    const width=outer?(lip?2.15:Math.min(3+9*apron,(ridgeFootX(p.z)-p.x-1.2)/1.10)):1.77;
    const floor=outer&&!lip?.42:p.y-.32;
    const at=(dx:number,y:number)=>new Vector3(p.x+dx*side.x,y,p.z+dx*side.z);
    const points=[at(-width,floor)];
    for(let j=0;j<=16;j++){
      const angle=Math.PI*(1-j/16);
      const sine=Math.sin(angle);
      const flank=outer&&!lip;
      const radius=flank?width*(1+.09*Math.cos(37*u+j*.85)):width;
      const elevation=flank ? Math.max(p.y+3.7-2.8*Math.pow(Math.abs(radius*Math.cos(angle))/2.15,2),1.1+Math.pow(sine,.78)*(p.y+4.5+1.1*apron*Math.cos(36*u))) :
        p.y+1.65+sine*(outer?2.16:1.77);
      points.push(at(radius*Math.cos(angle),elevation));
    }
    points.push(at(width,floor));
    return points;
  }
  const steps=Math.max(4,Math.ceil((end-start)*ridgeLength*2));
  let previous:Vector3[][]=[];
  for(let k=0;k<=steps;k++){
    const u=start+(end-start)*k/steps,lip=k<=1||k>=steps-1;
    const rings=[section(u,false,lip),section(u,true,lip)];
    for(let j=1;j<rings[0]!.length;j++){
      for(const [side,ring] of rings.entries()){
        if(k===0)continue;
        const last=previous[side]!,color=side===0?"#373833":lip?"#a8a392":(j<4||j>15?"#909782":"#8a9277");
        triangle(last[j-1]!,last[j]!,ring[j]!,color);triangle(last[j-1]!,ring[j]!,ring[j-1]!,color);
      }
      if(k===0||k===steps){
        const [inside,outside]=rings as [Vector3[],Vector3[]],color=j%3===0?"#a79f8c":"#bcb59e";
        triangle(inside[j-1]!,outside[j-1]!,outside[j]!,color);triangle(inside[j-1]!,outside[j]!,inside[j]!,color);
      }
    }
    previous=rings;
  }
  const g=new BufferGeometry();
  g.setAttribute("position",new Float32BufferAttribute(vertices,3));g.setAttribute("color",new Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
export function HeartRidge({day,replay,available,inspect}:{day:ReplayDay;replay:Replay;available:boolean;inspect:(a:number,b:number)=>void}){
  const profile=useMemo(()=>ridgeProfile(day.heartMeans),[day.heartMeans]),n=day.heartMeans.length;
  const terrain=useMemo(()=>ridgeMesh(profile,n),[profile,n]),track=useMemo(()=>rails(profile,n),[profile,n]);
  useEffect(()=>()=>{terrain.dispose();track.dispose()},[terrain,track]);
  const tunnels=useMemo(()=>profile.ranges.filter(r=>!r.valid && (r.start>0 || r.end<n)).map(r=>({...r,geometry:tunnelMesh(profile,r.start/n,r.end/n)})),[profile,n]);
  useEffect(()=>()=>tunnels.forEach(t=>t.geometry.dispose()),[tunnels]);
  const asset=useLoader(GLTFLoader,"/models/ridge-railcar.glb");
  const cars=useMemo(()=>[asset.scene.clone(true),asset.scene.clone(true)],[asset]);
  const train=useRef<Group>(null);
  const direction=useMemo(()=>new Vector3(),[]);
  useFrame(()=>{
    const u=replay.read().seconds/day.durationSeconds;
    if(!train.current)return;
    train.current.visible=available && profile.ranges.some(r=>r.valid);
    if(!train.current.visible)return;
    const pose=(distance:number)=>{
      const at=u+distance/ridgeLength,p=profile.track(Math.max(0,Math.min(1,at)));
      return new Vector3(p.x,p.y+.02,profile.z(at));
    };
    for(const [i,car] of cars.entries()){
      const offset=2.8-i*5.6,front=pose(offset+1.66),back=pose(offset-1.66);
      const centre=u+offset/ridgeLength;
      car.visible=!tunnels.some(t=>(t.start===0 || centre-2.8/ridgeLength>=t.start/n) &&
        (t.end===n || centre+2.8/ridgeLength<=t.end/n));
      car.position.copy(front).lerp(back,.5);
      direction.subVectors(front,back);car.rotation.order="YXZ";
      car.rotation.set(-Math.atan2(direction.y,Math.hypot(direction.x,direction.z)),Math.atan2(direction.x,direction.z),0,"YXZ");
    }
  });
  const click=(event:ThreeEvent<MouseEvent>,a:number,b:number)=>{if(event.delta>4)return;event.stopPropagation();inspect(a,b)};
  const trees=useRef<InstancedMesh>(null),rocks=useRef<InstancedMesh>(null);
  useLayoutEffect(()=>{
    if(!trees.current || !rocks.current)return;
    const surface=new Mesh(terrain,new MeshBasicMaterial({side:DoubleSide}));
    const ray=new Raycaster(),dummy=new Object3D();
    for(const [kind,instances,count] of [["tree",trees.current,215],["rock",rocks.current,75]] as const){
      let placed=0;
      for(let i=0;i<count;i++){
        const u=(i*.61803399+(kind==="tree"?.003:.157))%1,crest=profile.x(u);
        const shoulder=i%11===0;
        const z=shoulder?(i%2?1:-1)*(74+3*u):profile.z(u);
        const offset=kind==="tree"?16+3*Math.sin(31*u)+4*Math.cos(i*1.7):3+2*Math.sin(i*.83);
        const rear=i%2===0;
        const x=shoulder?profile.x(z>0?0:1)+4*Math.sin(i+(kind==="rock"?4:0)):rear?crest-(kind==="tree"?15+4*Math.sin(i*.79):5+3*Math.cos(i)):crest+offset;
        if (x>ridgeFootX(z)-1.4 || Math.abs(x-profile.track(u).x)<2.9) continue;
        ray.set(new Vector3(x,75,z),new Vector3(0,-1,0));
        const hit=ray.intersectObject(surface)[0];if(!hit || hit.point.y<surfaceHeight(x,z)-.04)continue;
        const size=.85+.32*Math.cos(i*.86);
        dummy.position.set(x,hit.point.y+(kind==="tree"?1.42*size:0),z);
        dummy.rotation.set(0,i*2.4,kind==="rock"?.26:0);
        dummy.scale.setScalar(size);
        dummy.updateMatrix();instances.setMatrixAt(placed,dummy.matrix);
        instances.setColorAt(placed,new Color(kind==="tree"?(i%3?"#567764":"#719076"):(i%3?"#9a9d8c":"#a9a695")));
        placed++;
      }
      instances.count=placed;instances.instanceMatrix.needsUpdate=true;
      if(instances.instanceColor)instances.instanceColor.needsUpdate=true;
      instances.computeBoundingSphere();
    }
    surface.material.dispose();
  },[terrain,profile]);
  return <group name="Heart-rate mountains">
    <mesh geometry={terrain} receiveShadow onClick={e=>{const i=profile.index(.5-e.point.z/ridgeLength);click(e,i,i+1)}}><meshStandardMaterial vertexColors side={DoubleSide}/></mesh>
    <lineSegments geometry={track}><lineBasicMaterial color="#55483c"/></lineSegments>
    <instancedMesh ref={trees} args={[undefined,undefined,215]}><coneGeometry args={[1.12,3.3,7]}/><meshStandardMaterial flatShading/></instancedMesh>
    <instancedMesh ref={rocks} args={[undefined,undefined,75]}><dodecahedronGeometry args={[1.1,0]}/><meshStandardMaterial flatShading/></instancedMesh>
    {[0,1].map(u=>{
      if(day.heartMeans[profile.index(u)]==null)return null;
      const p=profile.track(u),end=u===0?1:-1;
      return <group key={u} position={[p.x,0,p.z+end*2.85]}>
        <mesh position-y={p.y/2-.09}><boxGeometry args={[2.6,p.y,5.7]}/><meshStandardMaterial color="#9b9886"/></mesh>
        {[-.46,.46].map(dx=><mesh key={dx} position={[dx,p.y-.035,0]}><boxGeometry args={[.055,.07,5.7]}/><meshStandardMaterial color="#55483c"/></mesh>)}
      </group>
    })}
    {available && tunnels.map(t=><group key={t.start} onClick={e=>click(e,t.start,t.end)}>
      <mesh geometry={t.geometry}><meshStandardMaterial vertexColors side={DoubleSide} flatShading/></mesh>
      {[t.start,t.end].filter(i=>i>0&&i<n).map(i=>{
        const p=profile.track(i/n);
        const outward=i===t.start?1:-1;
        return <group key={i} position={[p.x,p.y+3.54,p.z+outward*.31]} rotation-y={outward===1?0:Math.PI}>
          <mesh><boxGeometry args={[1.58,.38,.09]}/><meshStandardMaterial color="#414a42"/></mesh>
          <SignText text="No data" position={[0,0,.05]} yaw={0} width={1.42} height={.33}/>
        </group>;
      })}
    </group>)}
    <group ref={train} name="Ridge train" onClick={e=>{const i=profile.index(replay.read().seconds/day.durationSeconds);click(e,i,i+1)}}>{cars.map((car,i)=><primitive key={i} object={car} dispose={null}/>)}</group>
  </group>
}
