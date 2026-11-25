import { noise,islandNoisePoint,type IslandTerrain } from "./island-shape.ts";
import { seededRandom } from "./random.ts";
import { reefProfile } from "./reef.ts";

export interface Placement {name:string;x:number;y:number;z:number;yaw:number;scale:[number,number,number];wet:boolean}
export const colonies=["coral-table","coral-plate","coral-boulder","coral-brain","coral-branch","sponge-tubes","sea-fan","soft-coral"] as const;
export function islandLayout(land:IslandTerrain){
  const objects:Placement[]=[],rand=seededRandom(String(land.seed),"reef-life");
  const {left,right,bottom,top}=land.bounds;
  const variant=(n:number)=>String.fromCharCode(97+Math.floor(rand()*n));
  function add(name:string,x:number,y:number,z:number,scale:[number,number,number],yaw=rand()*Math.PI*2,wet=false){
    objects.push({name,x,y,z,yaw,scale,wet});
  }
  const trees:{x:number;z:number}[]=[];
  for(let i=0;i<land.area*.20 && land.area>480;i++){
    const x=left+rand()*(right-left),z=bottom+rand()*(top-bottom),inland=-land.distance(x,z);
    const [u,v]=islandNoisePoint(x,z);
    const spitEnd=left+(right-left)*(.19+.035*noise(v*.065,land.seed));
    const spacing=2.2+5.8*noise(u*.09+land.seed,v*.09);
    if(x<spitEnd || inland<land.beachWidth(x,z)+4.5 || trees.some(p=>Math.hypot(p.x-x,p.z-z)<spacing))continue;
    const size=.91+rand()*.21;
    add("broadleaf-"+variant(3),x,land.elevation(x,z),z,[size,size,size]);trees.push({x,z});
  }
  const palms:{x:number;z:number}[]=[];
  const limit=land.area<=120?0:land.area<=480?2:Math.round(land.radius*.75);
  for(let i=0;i<800 && palms.length<limit;i++){
    const p=land.polygon[Math.floor(rand()*land.polygon.length)]!;
    const a=Math.atan2(p[1]-land.center[1],p[0]-land.center[0]);
    const d=land.beachWidth(...p)*(.78+rand()*.28);
    const cx=p[0]-d*Math.cos(a),cz=p[1]-d*Math.sin(a);
    const count=2+Math.floor(rand()*5);
    for(let j=0;j<count && palms.length<limit;j++){
      const x=cx+(rand()-.5)*9,z=cz+(rand()-.5)*9,inland=-land.distance(x,z);
      if(inland<2 || inland>land.beachWidth(x,z)+4 || palms.some(q=>Math.hypot(q.x-x,q.z-z)<2.9))continue;
      const size=.95+rand()*.23;
      add("palm-"+variant(3),x,land.elevation(x,z),z,[size,size,size],-a+.4*(rand()-.5));palms.push({x,z});
    }
  }
  for(let i=0;i<land.area*.18;i++){
    const x=left+rand()*(right-left),z=bottom+rand()*(top-bottom);
    const inland=-land.distance(x,z),width=land.beachWidth(x,z),[u,v]=islandNoisePoint(x,z),patch=noise(u*.16,v*.16+land.seed);
    if(inland<width-1.2 || inland>width+2 || patch<.32 || land.area<=120)continue;
    const size=.75+.45*rand();
    add(rand()<.7?"shrub-"+variant(2):"grass-a",x,land.elevation(x,z),z,[size,size,size]);
  }
  for(let i=0;i<3;i++){
    const a=[.12,.18,.65][i]!+.08*rand();
    const p=land.polygon[Math.floor(a*land.polygon.length)]!;
    add("beach-rock-a",p[0],.07,p[1],[1+rand()*2.5,.8,1.2]);
  }
  for(let i=0;i<Math.ceil(land.radius*.47);i++){
    const p=land.polygon[Math.floor(rand()*land.polygon.length)]!;
    const dx=land.center[0]-p[0],dz=land.center[1]-p[1],r=Math.hypot(dx,dz);
    const x=p[0]+2*dx/r,z=p[1]+2*dz/r;
    add("driftwood-a",x,land.elevation(x,z)+.05,z,[.32+rand()*.53,.8,.7],-Math.atan2(dz,dx)+Math.PI/2);
  }

  const bounds=land.reef.bounds,mounds:{x:number;z:number;r:number}[]=[];
  function bommie(x:number,z:number,crest=false){
    const p=reefProfile(land,x,z);
    if(p.zone==="sea" || p.zone==="toe" || p.depth>8 || p.shore<7)return;
    const lagoon=p.zone==="lagoon";
    if(!crest && (p.patch<.26 || (lagoon && rand()>.09)))return;
    const r=1.55+2.35*rand(),gap=lagoon?2+4*rand():-1.9;
    if(mounds.some(m=>Math.hypot(x-m.x,z-m.z)<r+m.r+gap))return;
    mounds.push({x,z,r});
    const h=.5+rand(),base=-p.depth-.04,visible=Math.min(h,p.depth*.72);
    add("bommie-a",x,base+visible-h*.85,z,[r,h,r],rand()*6.28,true);
    const sites:{x:number;z:number}[]=[];
    const target=12+Math.floor(20*rand()),yaw=rand()*6.28;
    for(let i=0;i<target*6 && sites.length<target;i++){
      const a=rand()*6.283+ yaw,u=Math.sqrt(rand()),cx=x+r*.94*u*Math.cos(a),cz=z+r*.85*u*Math.sin(a);
      if(sites.some(q=>Math.hypot(cx-q.x,cz-q.z)<.32))continue;
      const local=reefProfile(land,cx,cz);
      if(local.zone==="toe" || local.zone==="sea" || local.shore<6)continue;
      const width=.4+(rand()**2)*(local.zone==="crest"?1.05:2.6),sy=Math.min(width,.64*local.depth);
      const surface=base+visible-h*(1-Math.sqrt(1-u*u));
      const y=Math.min(-.11-sy*.83,Math.max(-local.depth-.03,surface));
      const kind=(local.zone==="crest" && rand()<.66)?"coral-plate":colonies[Math.floor(rand()*colonies.length)]!;
      add(kind+"-a",cx,y,cz,[width,sy,width],rand()*6.28,true);sites.push({x:cx,z:cz});
    }
  }
  // Walk the crest with jittered spacing. Low patches open short gaps in the band.
  let run=0,next=0;
  for(let i=0;i<land.reef.polygon.length;i++){
    const a=land.reef.polygon[i]!,b=land.reef.polygon[(i+1)%land.reef.polygon.length]!;
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    while(next<run+length){
      const t=(next-run)/length;
      const x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
      const dx=land.reef.center[0]-x,dz=land.reef.center[1]-z,r=Math.hypot(dx,dz);
      bommie(x+2.5*dx/r,z+2.5*dz/r,true);next+=2.3+rand()*2.6;
    }
    run+=length;
  }
  for(let i=0;i<land.platformArea*.014;i++){
    bommie(bounds.left-8+rand()*(bounds.right-bounds.left+16),bounds.bottom-8+rand()*(bounds.top-bounds.bottom+16));
  }
  // Reserve lagoon sites explicitly: the flat and crest occupy most of the reef.
  // A random draw across the whole platform can leave the landing lagoon empty.
  const candidates:{x:number;z:number;priority:number}[]=[];
  let lagoonArea=0;
  for(let x=bounds.left;x<bounds.right;x+=3)for(let z=bounds.bottom;z<bounds.top;z+=3){
    const p=reefProfile(land,x,z);
    if(p.zone!=="lagoon")continue;
    lagoonArea+=9;
    if(p.depth>1.0 && p.shore>7 && p.patch>.3){
      const nearLanding=Math.abs(x-land.pier[0])<18 && Math.abs(x-land.pier[0])>4 && z>land.shore[1];
      candidates.push({x,z,priority:rand()+(nearLanding?1:0)});
    }
  }
  let lagoonCount=mounds.filter(m=>reefProfile(land,m.x,m.z).zone==="lagoon").length;
  for(const site of candidates.sort((a,b)=>b.priority-a.priority)){
    if(lagoonCount>=Math.round(lagoonArea/300))break;
    const before=mounds.length;
    bommie(site.x,site.z,true);
    lagoonCount+=mounds.length-before;
  }
  return objects;
}
