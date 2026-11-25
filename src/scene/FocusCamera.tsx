import {useEffect,useMemo,useRef,type RefObject} from "react";
import {useFrame,useThree} from "@react-three/fiber";
import {MathUtils,OrthographicCamera,Spherical,Vector3} from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {startFlight,type CameraPose,type FocusTarget} from "./focus-flight.ts";
import {cameraSpots} from "./city/camera-spots.ts";
import {addCameraClearance} from "./camera-depth.ts";
import {damSite} from "./reservoir-basin.ts";
import {coast} from "./coastline.ts";
import {outerReef} from "./sleep/outer-reef.ts";
import {JETTY_HEAD} from "./sleep/route.ts";
import {asleepSeconds,elapsedSeconds,type DaySleepVoyage} from "./sleep/session.ts";
import {destination} from "./sleep/island-preview.ts";
import {voyage} from "./sleep-voyage.ts";
import {companionState} from "./sleep/wildlife.ts";
import type {Replay} from "../core/replay.ts";

type Point=[number,number,number];
type Frame={at:Point;eye:Point;w:number;h:number};
const axis=new Vector3(0,1,0);
const frames:Record<Exclude<FocusTarget,"sleep"|"world">,Frame>={
  heart:{at:[-225,15,0],eye:[70,77,0],w:164,h:58},
  hrv:{at:[-123,23,0],eye:[110,90,45],w:178,h:148},
  rhr:{at:[damSite.x,16,damSite.z-5],eye:[43,79,77],w:127,h:82},
  steps:{at:cameraSpots.walk,eye:[-16,30,18],w:36,h:27},
  energy:{at:cameraSpots.road,eye:[-16,30,18],w:77,h:57},
};
function islandFrames(sleep:DaySleepVoyage|null){
  const land=sleep&&asleepSeconds(sleep.session)>0?destination(sleep.session):null;
  const bounds=[...coast.map(p=>p.crest),...outerReef.vertices,...(land?.reef.polygon??[]),...(land?[JETTY_HEAD]:[])];
  const xs=bounds.map(p=>p[0]),zs=bounds.map(p=>p[1]);
  const l=Math.min(...xs),r=Math.max(...xs),n=Math.min(...zs),s=Math.max(...zs);
  const world:Frame={at:[(l+r)/2,8,(n+s)/2],eye:[0,112,110],w:r-l+18,h:(s-n)*.72+28};
  if(!land)return {world,island:null};
  const eye=new Vector3(75,48,20),right=new Vector3().crossVectors(axis,eye).normalize(),up=new Vector3().crossVectors(eye,right).normalize();
  const points=[...land.polygon,land.pier,JETTY_HEAD];
  const x=points.map(([x,z])=>x*right.x+z*right.z),y=points.map(([x,z])=>x*up.x+z*up.z);
  const w=Math.max(...x)-Math.min(...x),h=Math.max(...y)-Math.min(...y);
  const at=new Vector3(land.center[0],2,land.center[1]);
  at.addScaledVector(right,Math.min(...x)+w/2-at.dot(right));
  at.addScaledVector(up,Math.min(...y)+h/2+3-at.dot(up));
  const island:Frame={at:at.toArray(),eye:eye.toArray(),w:w+20,h:h+20};
  return {world,island};
}

export function FocusCamera({focus,command,open,replay,sleep}:{focus:RefObject<Vector3>;command:{view:FocusTarget;revision:number};open:string|number|null;replay:Replay;sleep:DaySleepVoyage|null}){
  const {camera,gl,size}=useThree();
  const cam=camera as OrthographicCamera;
  const views=useMemo(()=>islandFrames(sleep),[sleep]);
  const controls=useRef<OrbitControls|null>(null),flight=useRef<ReturnType<typeof startFlight>|null>(null);
  const last=useRef<CameraPose|null>(null),elapsed=useRef(0),dirty=useRef(true),mode=useRef("");
  const inset=useRef({x:0,y:0});
  useEffect(()=>{
    const orbit=new OrbitControls(cam,gl.domElement);
    controls.current=orbit;orbit.minPolarAngle=.12*Math.PI;orbit.maxPolarAngle=.47*Math.PI;
    orbit.minZoom=.1;orbit.maxZoom=180;orbit.zoomSpeed=.7;orbit.panSpeed=.65;
    function cancel(){flight.current?.cancel();flight.current=null;orbit.enabled=true;gl.domElement.style.opacity="";}
    const el=gl.domElement;
    for(const event of ["pointerdown","wheel","touchstart"])el.addEventListener(event,cancel,{capture:true,passive:true});
    return ()=>{for(const event of ["pointerdown","wheel","touchstart"])el.removeEventListener(event,cancel,true);orbit.dispose();cam.clearViewOffset();gl.domElement.style.opacity="";};
  },[gl,cam]);
  useEffect(()=>{dirty.current=true;},[command,open,size.width,size.height]);
  const previous=useRef({command,replay,open});
  const hold=useRef(false);
  useEffect(()=>{
    const world=gl.domElement.closest(".world");
    const card=open!==null?world?.querySelector("aside"):null;
    function measure(){
      const canvas=gl.domElement.getBoundingClientRect(),rect=card?.getBoundingClientRect();
      const mobile=window.matchMedia("(max-width: 700px)").matches;
      const x=rect&&!mobile?MathUtils.clamp(canvas.right-rect.left+12,0,canvas.width*.64):0;
      const y=rect&&mobile?MathUtils.clamp(canvas.bottom-rect.top+8,0,canvas.height*.92):0;
      if(x!==inset.current.x||y!==inset.current.y){inset.current={x,y};dirty.current=true;}
    }
    measure();const observer=new ResizeObserver(measure);
    if(card)observer.observe(card);observer.observe(gl.domElement);return ()=>observer.disconnect();
  },[open,command,gl]);
  useFrame((_,dt)=>{
    const orbit=controls.current;if(!orbit)return;
    const prior=previous.current;
    previous.current={command,replay,open};
    if(command!==prior.command)hold.current=false;
    else if(replay!==prior.replay || (prior.open!==null&&open===null)){
      hold.current=true;flight.current=null;orbit.enabled=true;gl.domElement.style.opacity="";
    }
    if(hold.current){
      if(command.view==="sleep"&&open!==null&&replay.read().seconds>0){
        hold.current=false;dirty.current=true;
      }else{
        focus.current.copy(orbit.target);return;
      }
    }
    let frame:Frame,kind:string=command.view;
    if(command.view==="world")frame=views.world;
    else if(command.view!=="sleep")frame=frames[command.view];
    else if(views.island&&sleep&&sleep.offset+replay.read().seconds>=elapsedSeconds(sleep.session)){
      frame=views.island;kind="island";
    }else if(!sleep){frame={at:cameraSpots.berth,eye:[17,11,10],w:53,h:33};kind="berth";}
    else{
      const ship=voyage(sleep,replay.read().seconds);
      const animal=ship.stage==="REM"?companionState(sleep.session,ship.t):null;
      const shift=animal?animal.side*animal.across*(animal.kind==="whale"?.74:.57)*animal.fade:0;
      const lead=ship.stage==="LIGHT"?4.5:0;
      const eye=new Vector3(-3,30,15).applyAxisAngle(axis,ship.yaw);
      frame={at:[ship.x+shift*Math.sin(ship.yaw)+lead*Math.cos(ship.yaw),1.6,ship.z+shift*Math.cos(ship.yaw)-lead*Math.sin(ship.yaw)],eye:eye.toArray(),w:54,h:26};
    }
    if(kind!=="sleep" && !dirty.current && !flight.current && mode.current===kind){
      focus.current.copy(orbit.target);
      return;
    }
    const {x,y}=inset.current;
    const target=new Vector3(...frame.at),eye=addCameraClearance(target.clone().add(new Vector3(...frame.eye)),target);
    const sph=new Spherical().setFromVector3(eye.sub(target));
    const end:CameraPose={target,azimuth:sph.theta,polar:MathUtils.clamp(sph.phi,orbit.minPolarAngle,orbit.maxPolarAngle),radius:sph.radius,
      zoom:Math.min((size.width-x)/frame.w,(size.height-y)/frame.h),width:frame.w,offsetX:x/2,offsetY:y/2};
    let pose:CameraPose|null=null;
    if(dirty.current||kind!==mode.current){
      dirty.current=false;mode.current=kind;
      if(last.current){
        const cur=new Spherical().setFromVector3(cam.position.clone().sub(orbit.target));
        flight.current=startFlight({target:orbit.target.clone(),azimuth:cur.theta,polar:cur.phi,radius:cur.radius,zoom:cam.zoom,
          width:last.current.width*last.current.zoom/cam.zoom,offsetX:cam.view?.offsetX??0,offsetY:cam.view?.offsetY??0},end,matchMedia("(prefers-reduced-motion: reduce)").matches);
        elapsed.current=0;orbit.enabled=false;
      }else pose=end;
    }
    if(flight.current){
      elapsed.current+=dt;
      const progress=Math.min(1,elapsed.current/flight.current.duration);
      if(flight.current.reduced)gl.domElement.style.opacity=String(1-.65*Math.sin(Math.PI*progress));
      pose=flight.current.sample(elapsed.current,end);
      if(elapsed.current>=flight.current.duration){flight.current=null;orbit.enabled=true;gl.domElement.style.opacity="";}
    }else if(!pose&&kind==="sleep"&&last.current){
      const delta=target.clone().sub(last.current.target);
      cam.position.sub(orbit.target).applyAxisAngle(axis,end.azimuth-last.current.azimuth).add(orbit.target).add(delta);
      orbit.target.add(delta);orbit.update();
    }
    if(pose){
      orbit.target.copy(pose.target);cam.position.setFromSphericalCoords(pose.radius,pose.polar,pose.azimuth).add(orbit.target);
      cam.zoom=pose.zoom;
      cam.setViewOffset(size.width,size.height,pose.offsetX,pose.offsetY,size.width,size.height);
      orbit.update();
    }
    focus.current.copy(orbit.target);last.current=end;
  });
  return null;
}
