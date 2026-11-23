import { useEffect, useLayoutEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, CanvasTexture, Color, CylinderGeometry, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, SRGBColorSpace } from "three";
import type { Replay } from "../../core/replay.ts";
import { CITY_PLAN } from "./city-plan.data.ts";
import { trafficApproaches } from "./routes.ts";
import { sections } from "./street-graph.ts";
import { signalApproaches, signalAt } from "./traffic-signals.ts";
import { surfaceHeight } from "./terrain.ts";

const colors = ["#ff503b","#ffb534","#63e39d"];
function buildHeads() {
  const mast = new BoxGeometry(), disk = new CylinderGeometry(1,1,1,16);
  disk.rotateX(Math.PI/2);
  const octagon = new CylinderGeometry(1,1,1,8);
  octagon.rotateY(Math.PI/8); octagon.rotateX(Math.PI/2);
  const lit = new MeshBasicMaterial({toneMapped:false}), metal = new MeshStandardMaterial({roughness:.82});
  const signals = signalApproaches.filter(a => a.node.control==="signal").length;
  const stops = signalApproaches.filter(a => a.hasStop).length;
  const supports = new InstancedMesh(mast,metal,signals*3+stops);
  const lamps = new InstancedMesh(disk,lit,signals*3);
  const signs = new InstancedMesh(octagon,metal,stops*2);
  const canvas=document.createElement("canvas");
  canvas.width=256; canvas.height=100;
  const ctx=canvas.getContext("2d")!;
  ctx.font="bold 90px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillStyle="#ffffff"; ctx.fillText("STOP",128,54,246);
  const ink=new CanvasTexture(canvas);
  ink.colorSpace=SRGBColorSpace;
  const lettering=new MeshBasicMaterial({map:ink,alphaTest:.35});
  const face=new PlaneGeometry(1,1);
  const labels=new InstancedMesh(face,lettering,stops);
  const object = new Object3D(), tint = new Color();
  const heads: number[] = [];
  let support = 0, sign = 0;
  for (const [index,a] of signalApproaches.entries()) {
    if (a.node.control!=="signal" && !a.hasStop) continue;
    const width = sections[CITY_PLAN.edges.find(e => e.id===trafficApproaches[index]!.edge)!.cls].road;
    const ground = surfaceHeight(a.x,a.z)+.16;
    // The support stands on the right curb and the lenses face approaching traffic.
    function part(mesh:InstancedMesh, slot:number, side:number, along:number, h:number,
      w:number, height:number, depth:number, color:string) {
      object.position.set(a.x+a.dz*side+a.dx*along,ground+h,a.z-a.dx*side+a.dz*along);
      object.rotation.y=Math.atan2(a.dx,a.dz);
      object.scale.set(w,height,depth); object.updateMatrix();
      mesh.setMatrixAt(slot,object.matrix); mesh.setColorAt(slot,tint.set(color));
    }
    const curb = width/2+.55;
    if (a.hasStop) {
      part(supports,support++,curb,2.5,1.2,.09,2.4,.09,"#66736e");
      part(signs,sign++,curb,2.5,2.35,.48,.48,.055,"#ece7da");
      part(signs,sign++,curb,2.54,2.35,.447,.447,.035,"#be382e");
      part(labels,sign/2-1,curb,2.58,2.35,.71,.29,1,"#ffffff");
      continue;
    }
    const arm = 3.1;
    part(supports,support++,curb,2.5,2.85,.16,5.7,.16,"#586660");
    part(supports,support++,curb-arm/2,2.5,5.64,arm+.16,.16,.16,"#586660");
    part(supports,support++,curb-arm,2.5,5.04,.53,1.26,.34,"#343d38");
    for (let j=0;j<3;j++)
      part(lamps,heads.length*3+j,curb-arm,2.70,5.43-j*.39,.16,.16,.08,"#352f2a");
    heads.push(index);
  }
  supports.castShadow=true;
  return {supports,lamps,signs,labels,heads,dispose() {
    for (const m of [supports,lamps,signs,labels]) m.dispose();
    for (const resource of [mast,disk,octagon,lit,metal,face,lettering,ink]) resource.dispose();
  }};
}
export function CitySignals({replay}:{replay:Replay}) {
  const models = useMemo(buildHeads,[]);
  useEffect(()=>()=>models.dispose(),[models]);
  const paint = useMemo(() => {
    const previous = models.heads.map(() => -1), tint = new Color();
    return (time:number) => models.heads.forEach((index,i)=>{
      const light = signalAt(index,time).light;
      const active = light==="green" ? 2 : light==="amber" ? 1 : 0;
      if (active===previous[i]) return;
      previous[i]=active;
      for(let j=0;j<3;j++) models.lamps.setColorAt(i*3+j,tint.set(j===active?colors[j]!:"#352f2a"));
      models.lamps.instanceColor!.needsUpdate=true;
    });
  },[models]);
  useLayoutEffect(()=>paint(replay.read().seconds),[paint,replay]);
  useFrame(()=>paint(replay.read().seconds));
  return <group name="Street signals and stop signs">
    {[models.supports,models.lamps,models.signs,models.labels].map(mesh=><primitive key={mesh.uuid} object={mesh}/>)}
  </group>;
}
