import { Color, Group, InstancedMesh, Mesh, MeshStandardMaterial, MeshBasicMaterial, Object3D, RingGeometry, SphereGeometry } from "three";
import { DRY_LAYER, SEABED_LAYER, TRANSPARENT_LAYER } from "../ocean/layers.ts";
import { SYNTHETIC_SESSION as session } from "./session.ts";
import { routeDistanceAt, routeSpans } from "./timeline.ts";
import { routeFrame, S_MOUTH } from "./route.ts";
import { destination } from "./island-preview.ts";
import { clamp, companionState, dolphinAt, fishAt, lightEvents } from "./wildlife.ts";

type Frame=ReturnType<typeof routeFrame>;

export function wildlifeRig(library:Object3D){
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
  const birds=["booby","tern"].map(name=>pool(name,asset(name),9,DRY_LAYER));
  const wingTime={value:0};
  const feathers=(birds[0]!.material as MeshStandardMaterial).clone();
  feathers.onBeforeCompile=shader=>{
    shader.uniforms.wingTime=wingTime;
    shader.vertexShader="uniform float wingTime;\n"+shader.vertexShader.replace("#include <begin_vertex>",`
      #include <begin_vertex>
      float wing=max(0.,abs(position.z)-.085);
      float flap=.66*sin(wingTime*7.+instanceMatrix[3].x*.19);
      transformed.y+=wing*sin(flap);
      transformed.z+=sign(position.z)*wing*(cos(flap)-1.);
    `);
  };
  for(const bird of birds)bird.material=feathers;
  const fish=pool("Flying fish",asset("flying-fish"),32),pod=pool("Dolphin pod",asset("dolphin"),12);
  const school=pool("Silver school",asset("school-fish"),216,SEABED_LAYER);
  const ringGeometry=new RingGeometry(.89,1,28).rotateX(-Math.PI/2);
  const foam=new MeshBasicMaterial({color:"#deeee6",transparent:true,opacity:.62,depthWrite:false});
  const dropGeometry=new SphereGeometry(1,6,4),glow=new MeshBasicMaterial({color:"#4fe3c1",toneMapped:false});
  const ringFoam=foam.clone();
  ringFoam.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace("#include <color_fragment>","diffuseColor.a *= vColor.r;");
  };
  const rings=pool("Surface rings",new Mesh(ringGeometry,ringFoam),48,TRANSPARENT_LAYER);
  const drops=pool("Surface spray",new Mesh(dropGeometry,foam),48,DRY_LAYER);
  const sparks=pool("REM plankton",new Mesh(dropGeometry,glow),144,TRANSPARENT_LAYER);
  const animals=(["ray","shark","whale"] as const).map(kind=>{
    const model=asset(kind).clone(true);model.visible=false;root.add(model);
    return {kind,model,tail:model.getObjectByName(kind==="whale"?"whale-flukes":kind+"-tail")!,
      left:model.getObjectByName("ray-wing-left"),right:model.getObjectByName("ray-wing-right")};
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
  const events=lightEvents(session);
  function update(t:number,night:number){
    wingTime.value=t/190;
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
        pose.scale.z=.85+.15*Math.cos(a*7+i);stamp(birds[i%2]!);
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
          pose.rotation.y-=e.side*.95;pose.rotation.z=.12*Math.cos(Math.PI*p.progress);stamp(fish);
        }
      }
    }
    const state=companionState(session,t);
    if(state&&state.fade>0 && d>S_MOUTH+12){
      const {side,across,kind,fade,cycle,special}=state,z=side*across,along=-1.7;
      for(const animal of animals){
        // The depth value follows the whale's back. Its origin lies below the back.
        const y=kind==="whale"?state.height-1.42+1.65*state.surface:state.height;
        if(kind!==animal.kind||!place(f,along,z,y))continue;
        const {model}=animal;model.visible=true;model.position.copy(pose.position);model.scale.setScalar(asset(kind).scale.x*fade);
        model.rotation.set(kind==="ray"?state.roll:0,f.yaw,kind==="whale"?.77*state.breach-.40*state.surface*Math.sin(cycle*3.34):0,"YXZ");
        if(kind==="ray"){animal.left!.rotation.x=state.wing;animal.right!.rotation.x=-state.wing;}
        if(kind==="whale")animal.tail.rotation.z=.65*state.surface+.12*Math.sin(state.a*3);
        else animal.tail.rotation.y=state.tail;
      }
      if(kind==="whale"){
        spray(f,along+3.2,z,cycle/.73,17,3.65,1.2);
        spray(f,along,z,(special-.73)/.68,26,3.1,4.6);
        ring(f,along+2,z,cycle,2.6);ring(f,along,z,special-.73,4.8);
      }else if(kind==="dolphin"){
        for(let i=0;i<state.pod;i++){
          const p=dolphinAt(i,state.a,side);
          if(!place(f,p.along,p.across,p.height))continue;
          pose.rotation.z=p.pitch;pose.scale.setScalar(fade);stamp(pod);
          ring(f,p.along-1,p.across,p.ripple,1.05);
        }
      }else {
        const phase=state.a%(kind==="ray"?2.4:1.8);
        ring(f,along-1,z+(kind==="ray"?2:0),phase,1.12);
      }
      const turn=Math.sin(state.a*.87),flash=Math.pow(Math.abs(Math.cos(state.a*.87)),14);
      for(let i=0;i<216;i++){
        const angle=i*2.39996,r=Math.sqrt((i+.5)/216),cx=3.2*r*Math.cos(angle),cz=2*r*Math.sin(angle);
        if(!place(f,3+cx*Math.cos(turn)-cz*Math.sin(turn),-side*6+cx*Math.sin(turn)+cz*Math.cos(turn),-1.22+.68*Math.sin(i*8.3+a)))continue;
        pose.rotation.y-=turn+.18*Math.sin(angle+a);pose.scale.setScalar(fade*(.8+.42*((i*13)%19)/18));
        color.setRGB(.55+.45*flash,.66+.34*flash,.70+.30*flash);school.setColorAt(school.count,color);stamp(school);
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
    ringGeometry.dispose();dropGeometry.dispose();foam.dispose();ringFoam.dispose();glow.dispose();feathers.dispose();
  }
  return {root,update,dispose};
}
