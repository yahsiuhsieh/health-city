import { BufferGeometry, Float32BufferAttribute, InstancedBufferAttribute, PlaneGeometry, DoubleSide, Color, Group, InstancedMesh, Mesh, MeshStandardMaterial, MeshBasicMaterial, Object3D, RingGeometry, SphereGeometry } from "three";
import { DRY_LAYER, TRANSPARENT_LAYER } from "../ocean/layers.ts";
import { SYNTHETIC_SESSION as session } from "./session.ts";
import { routeDistanceAt, routeSpans } from "./timeline.ts";
import { routeFrame, S_MOUTH } from "./route.ts";
import { destination } from "./island-preview.ts";
import { clamp, companionState, dolphinAt, fishAt, lightEvents } from "./wildlife.ts";

import { animalMaterial, type animalMotion } from "./animal-motion.ts";

type Frame=ReturnType<typeof routeFrame>;

export function wildlifeRig(library:Object3D,waterPass:{value:number}){
  const root=new Group(),pose=new Object3D(),color=new Color(),reef=destination().reef;
  root.name="Stage wildlife";
  const meshes:InstancedMesh[]=[];
  function pool(name:string,source:Mesh,capacity:number,layer?:number){
    const batch=new InstancedMesh(source.geometry,source.material,capacity);
    batch.name=name;batch.frustumCulled=false;batch.count=0;
    if(layer!==undefined)batch.layers.set(layer);
    root.add(batch);meshes.push(batch);return batch;
  }
  const asset=(name:string)=>library.getObjectByName(name) as Mesh;
  const clock={value:0},daylight={value:1},curve={value:0},still={value:0};
  const skins=new Map<string,MeshStandardMaterial>();
  function skin(kind:keyof typeof animalMotion,mesh:Mesh){
    let mat=skins.get(kind);
    if(!mat){mat=animalMaterial(mesh.material as MeshStandardMaterial,kind,clock,waterPass,daylight,
      kind==="tern"||kind==="booby"||kind==="flying-fish"?still:curve);skins.set(kind,mat);}
    mesh.material=mat;
  }
  const birds=(["booby","tern"] as const).map(name=>{
    const bird=pool(name,asset(name),9,DRY_LAYER);skin(name,bird);return bird;
  });
  const fish=pool("Flying fish",asset("flying-fish"),32,DRY_LAYER),pod=pool("Dolphin pod",asset("dolphin"),10);
  fish.geometry=fish.geometry.clone();
  const beats=new InstancedBufferAttribute(new Float32Array(32),1);
  fish.geometry.setAttribute("launchBeat",beats);
  skin("flying-fish",fish);skin("dolphin",pod);
  const shadowMaterial=new MeshBasicMaterial({color:"#0c2837",transparent:true,depthWrite:false});
  shadowMaterial.onBeforeCompile=shader=>{
    shader.vertexShader="varying vec2 shadowUv;\n"+shader.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nshadowUv=uv*2.-1.;");
    shader.fragmentShader="varying vec2 shadowUv;\n"+shader.fragmentShader.replace("#include <color_fragment>",
      "diffuseColor.a *= .27*(1.-smoothstep(.1,1.,length(shadowUv)));");
  };
  const shadowGeometry=new PlaneGeometry(2,2).rotateX(-Math.PI/2);
  const shadows=pool("Seabird shadows",new Mesh(shadowGeometry,shadowMaterial),9,TRANSPARENT_LAYER);
  const wakeGeometry=new BufferGeometry();
  wakeGeometry.setAttribute("position",new Float32BufferAttribute([0,0,0,-2,0,.62,-1.56,0,.40,0,0,0,-1.56,0,-.40,-2,0,-.62],3));
  const wakeMaterial=new MeshBasicMaterial({color:"#b1d3d8",transparent:true,opacity:.56,depthWrite:false,side:DoubleSide});
  const wakes=pool("Surfacing wakes",new Mesh(wakeGeometry,wakeMaterial),16,TRANSPARENT_LAYER);
  const ringGeometry=new RingGeometry(.89,1,28).rotateX(-Math.PI/2);
  const foam=new MeshBasicMaterial({color:"#deeee6",transparent:true,opacity:.62,depthWrite:false});
  const dropGeometry=new SphereGeometry(1,6,4),glow=new MeshBasicMaterial({color:"#4fe3c1",toneMapped:false});
  const ringFoam=foam.clone();
  ringFoam.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace("#include <color_fragment>","diffuseColor.a *= vColor.r;");
  };
  const mistGeometry=new PlaneGeometry(1,1);
  const mistMaterial=new MeshBasicMaterial({color:"#e0ebea",transparent:true,depthWrite:false,opacity:.44});
  mistMaterial.onBeforeCompile=shader=>{
    shader.vertexShader="varying vec2 mistUv;\n"+shader.vertexShader.replace("#include <project_vertex>",`
      mistUv=2.*uv-1.;
      vec4 mvPosition=modelViewMatrix*instanceMatrix[3];
      mvPosition.xy+=position.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));
      gl_Position=projectionMatrix*mvPosition;`);
    shader.fragmentShader="varying vec2 mistUv;\n"+shader.fragmentShader.replace("#include <color_fragment>",
      "diffuseColor.a*=vColor.r*(1.-smoothstep(.05,1.,dot(mistUv,mistUv)));");
  };
  const mist=pool("Whale blow mist",new Mesh(mistGeometry,mistMaterial),32,TRANSPARENT_LAYER);
  mist.renderOrder=3;
  const rings=pool("Surface rings",new Mesh(ringGeometry,ringFoam),48,TRANSPARENT_LAYER);
  const drops=pool("Surface spray",new Mesh(dropGeometry,foam),48,DRY_LAYER);
  const sparks=pool("REM plankton",new Mesh(dropGeometry,glow),144,TRANSPARENT_LAYER);
  const animals=(["ray","shark","whale"] as const).map(kind=>{
    const model=asset(kind).clone(true);model.visible=false;root.add(model);
    model.traverse(obj=>{if(obj instanceof Mesh)skin(kind,obj);});
    return {kind,model};
  });
  function place(f:Frame,along:number,across:number,y:number){
    pose.position.set(f.x+f.tx*along+f.nx*across,y,f.z+f.tz*along+f.nz*across);
    pose.rotation.set(0,f.yaw,0,"YXZ");pose.scale.setScalar(1);
    return pose.position.x>routeMouth && (pose.position.x<reef.bounds.left-30 || pose.position.z>reef.bounds.top+30 || reef.distance(pose.position.x,pose.position.z)>24);
  }
  const routeMouth=routeFrame(S_MOUTH).x;
  function stamp(batch:InstancedMesh){
    if(batch.count>=batch.instanceMatrix.count)return;
    pose.updateMatrix();batch.setMatrixAt(batch.count++,pose.matrix);
  }
  function ring(f:Frame,x:number,z:number,age:number,size:number,stretch=1){
    if(age<0||age>=1||!place(f,x,z,.035))return;
    const r=(.14+age*.95)*size;
    pose.scale.set(r*stretch,1,r);color.setScalar(1-age);rings.setColorAt(rings.count,color);stamp(rings);
  }
  function spray(f:Frame,x:number,z:number,age:number,n:number,height:number,spread:number){
    if(age<0||age>=1)return;
    for(let i=0;i<n;i++){
      const angle=i*2.4,r=spread*age*(.45+(i%5)/8);
      if(!place(f,x+r*Math.cos(angle),z+r*Math.sin(angle),.08+4*age*(1-age)*height*(.63+.37*(i%4)/3)))continue;
      const size=height*(.028+.022*(i%3))*(1-age*.8);
      pose.scale.set(size,size*(2.1-age),size);stamp(drops);
    }
  }
  function blow(f:Frame,x:number,z:number,cycle:number){
    for(let i=0;i<28;i++){
      const age=(cycle-i*.009)/.62;
      if(age<0||age>=1)continue;
      const spread=age*(.35+.75*(i%7)/6),angle=2.4*i;
      const y=.18+3.65*Math.sin(age*1.65)*(.82+.18*(i%5)/4);
      if(!place(f,x+spread*Math.cos(angle)-.43*age,z+spread*Math.sin(angle),y))continue;
      const w=.17+age*.92;pose.scale.set(w,w*(1.65-.5*age),1);
      color.setScalar(1-age);mist.setColorAt(mist.count,color);stamp(mist);
    }
  }
  const events=lightEvents(session);
  function update(t:number,night:number){
    clock.value=t/190;daylight.value=1-night;
    for(const batch of meshes)batch.count=0;
    for(const {model} of animals)model.visible=false;
    const span=t<0?undefined:routeSpans(session).find(s=>t<s.end);
    const d=routeDistanceAt(session,t),f=routeFrame(d),a=t/190;
    if(span?.stage==="LIGHT" && d>S_MOUTH){
      const active=events.filter(e=>e.start>=span.start&&e.start<=t && t-e.start<760);
      const dive=active.filter(e=>e.kind==="dive").at(-1),age=dive?(t-dive.start)/190:10;
      const n=night?3:5+span.index%5;
      for(let i=0;i<n;i++){
        const angle=a*(.51+.02*i)+i*2.4,r=night?5+i:8+(i%5)*2.7;
        let x=Math.cos(angle)*r,z=Math.sin(angle)*r,y=(night?4.2:6)+1.8*(1+Math.sin(a*.7+i))+(night?0:i%4);
        const diving=i===0&&dive&&age<1.3;
        if(diving){
          const mix=age<.76?clamp(age/.76):clamp(1-(age-.76)/.54);
          x+=(dive.along-x)*mix;z+=(dive.side*dive.across-z)*mix;y*=1-mix;
        }
        if(!place(f,x,z,y+.07))continue;
        pose.rotation.y-=angle+Math.PI/2;pose.rotation.x=.18*Math.sin(angle);
        pose.rotation.z=diving?(age<.76?-1.15:.83)*Math.sin(Math.PI*clamp(age/1.3)):.04*Math.sin(a*5+i);
        stamp(birds[i%2]!);
        if(place(f,x-.24*y,z-.32*y,.045)){
          pose.rotation.y-=angle;
          pose.scale.set(.45+y*.04,1,(i%2?.8:1.22)+y*.06);stamp(shadows);
        }
      }
      for(const e of active){
        const age=(t-e.start)/190;
        if(e.kind==="dive"){
          const impact=routeFrame(routeDistanceAt(session,e.start+.76*190));
          ring(impact,e.along,e.side*e.across,age-.76,1.35);
          spray(impact,e.along,e.side*e.across,(age-.76)*3,e.count,.92,.85);continue;
        }
        for(let i=0;i<e.count;i++){
          const p=fishAt(e,i,age),lift=age-i*.025;
          for(const contact of i%3===0?[0,.5,1]:[0,1]){
            const touch=fishAt(e,i,contact*e.duration+i*.025);
            ring(e.frame,touch.along,touch.across,lift-contact*e.duration,.22,3.8);
          }
          if(p.progress<0||p.progress>1||!place(e.frame,p.along,p.across,p.height))continue;
          beats.setX(fish.count,1-clamp(p.progress/.21));
          pose.rotation.y-=e.side*.95;pose.rotation.z=.12*Math.cos(Math.PI*p.progress);stamp(fish);
        }
      }
    }
    beats.needsUpdate=true;
    const state=companionState(session,t);
    if(state&&state.fade>0 && d>S_MOUTH+12){
      const {side,across,kind,fade,cycle,special}=state,z=side*across,along=-1.7;
      const past=routeFrame(Math.max(0,d-6)),ahead=routeFrame(d+1);
      curve.value=3.6*(past.tx*ahead.tz-past.tz*ahead.tx)+.12*Math.sin(state.a*.53);
      for(const animal of animals){
        // Depth is measured at the back. The mesh origin lies below it.
        const y=kind==="whale"?state.height-1.89+.9*state.surface:kind==="shark"?state.height-1.08:state.height;
        if(kind!==animal.kind||!place(f,along,z,y))continue;
        const {model}=animal;model.visible=true;model.position.copy(pose.position);model.scale.setScalar(asset(kind).scale.x*fade);
        model.rotation.set(kind==="ray"?state.roll:0,f.yaw,kind==="whale"?.95*state.breach-.55*state.dive:0,"YXZ");
      }
      function wake(x:number,across:number,size:number){
        if(place(f,x,across,.045)){pose.scale.setScalar(size);stamp(wakes);}
      }
      if(kind==="whale"){
        if(state.surface>.25)wake(along+2,z,1.9*state.surface);
        if(state.dive>.2)wake(along-6,z,1.35*state.dive);
        blow(f,along+3.2,z,cycle);
        spray(f,along,z,(special-.73)/.68,26,3.1,4.6);
        ring(f,along+2,z,cycle,2.6);ring(f,along,z,special-.73,4.8);
      }else if(kind==="dolphin"){
        for(let i=0;i<state.pod;i++){
          const p=dolphinAt(i,state.a,side);
          if(!place(f,p.along,p.across,p.height))continue;
          pose.rotation.z=p.pitch;pose.scale.setScalar(fade);stamp(pod);
          if(p.height>-.52)wake(p.along-.7,p.across,.85);
          ring(f,p.along-1,p.across,p.ripple,1.05);
        }
      }else {
        const phase=state.a%(kind==="ray"?2.4:1.8);
        if(kind==="shark"){
          wake(along-2.38,z+.43*Math.sin(2*Math.PI*.4*a-2.46),1.15);
          wake(along-7.05,z+1.18*Math.sin(2*Math.PI*.4*a-4.06),.74);
        }else{
          // Track the outermost wing station after its wave and body roll.
          const rise=.21+1.6*Math.sin(a*Math.PI-1.9-3.4*.53);
          for(const tip of [-4,4]){
            const height=state.height+rise*Math.cos(state.roll)-tip*Math.sin(state.roll);
            const lateral=tip*Math.cos(state.roll)+rise*Math.sin(state.roll);
            if(height>-.025)wake(along-.73,z+lateral,Math.min(1,.38+height));
          }
        }
        ring(f,along-1,z+(kind==="ray"?3.6:0),phase,1.12);
      }
      if(night)for(let i=0;i<64;i++){
        const pulse=Math.sin(state.a*8.6+i*17.3);
        if(pulse<.26)continue;
        const p=kind==="dolphin"?dolphinAt(i%state.pod,state.a,side):{along,across:z};
        if(!place(f,p.along-5*(i%13)/12,p.across+1.4*Math.sin(i*4.4),.03))continue;
        pose.scale.setScalar(fade*pulse*(.029+.022*(i%3)));stamp(sparks);
      }
      if(night)for(let i=0;i<80;i++){
        const phase=state.a*8+i*2.39996,light=Math.sin(phase);
        if(light<.2)continue;
        const bow=i<24,distance=(i*29%79)/79,sign=i%2?1:-1;
        const x=bow?9.2-2.6*distance:-9.94-6*distance;
        const lateral=sign*(bow?.57+1.1*distance:1.8*Math.sin(i*8.3));
        if(!place(f,x,lateral,.034))continue;
        pose.scale.setScalar(fade*(.038+.062*light)*(bow?1:1-distance*.7));stamp(sparks);
      }
    }
    for(const mesh of meshes){
      mesh.visible=mesh.count>0;
      if(mesh.visible){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
    }
  }
  function dispose(){
    for(const mesh of meshes)mesh.dispose();
    ringGeometry.dispose();dropGeometry.dispose();foam.dispose();ringFoam.dispose();glow.dispose();
    mistGeometry.dispose();mistMaterial.dispose();fish.geometry.dispose();shadowGeometry.dispose();shadowMaterial.dispose();wakeGeometry.dispose();wakeMaterial.dispose();
    for(const material of skins.values())material.dispose();
  }
  return {root,update,dispose};
}
