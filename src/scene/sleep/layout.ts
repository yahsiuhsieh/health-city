import { routeFrame, returnFrame, ROUTE_LENGTH, S_MOUTH } from "./route.ts";
import { seededRandom } from "./random.ts";
import { routeSpans, type RouteSpan } from "./timeline.ts";
import { sleepFeatures } from "./water-map.ts";
import type { SleepSession } from "./session.ts";

export interface Prop { variant:string; x:number; y:number; z:number; yaw:number; scale:number; routeS:number; top?:number }
export interface BankSection { s:number; nose:number; ridge:number; foot:number; width:number; side:number }
export interface Channel { sections:BankSection[] }
export const bankProfile = [[0,-.38],[.08,.06],[.21,.58],[.25,.63],[.34,.96],[.48,1],[.67,.98],[.79,.8],[1.12,-.38]] as const;
const transit=Array.from({length:420},(_,i)=>returnFrame(i/419));
function clear(x:number,z:number) {return transit.every(p=>(x-p.x)**2+(z-p.z)**2>6.3**2);}
function offsetAt(s:number,d:number){
  const f=routeFrame(s);
  return {x:f.x+f.nx*d,z:f.z+f.nz*d};
}
function channelSection(span:RouteSpan,s:number,side:number):BankSection{
  const taper=Math.max(0,Math.min(1,(s-span.s0+2)/4,(span.s1+2-s)/4));
  return {s,side,foot:8.5+Math.sin(s*.24+side)*.9,
    nose:(s<(span.s0+span.s1)/2?1:-1)*3*(1-taper),
    width:(8.1+1.1*Math.sin(s*.18-side))*(.18+.82*taper),ridge:(5.2+1.1*Math.sin(s*.2+side)+.5*Math.sin(s*.55+side))*taper+.06};
}
export function bankPoint(section:BankSection,u:number,h:number){
  const p=offsetAt(section.s+section.nose*(.85+.15*u),section.side*(section.foot+section.width*u));
  return {...p,y:h<0?h:h*section.ridge};
}

export function sleepLayout(session:SleepSession) {
  const props:Prop[]=[],channels:Channel[]=[];
  for(const span of routeSpans(session)){
    if(span.stage!=="DEEP")continue;
    const random=seededRandom(session.id,"channel-"+span.index);
    for(const side of [-1,1]){
      const start=Math.max(S_MOUTH,span.s0-2),end=Math.min(ROUTE_LENGTH-12,span.s1+2);
      if(end<=start)continue;
      if(span.s1-span.s0<10){
        const count=span.s1-span.s0<4?1:3;
        for(let i=0;i<count;i++){
          const s=start+(i+.5)*(end-start)/count,p=offsetAt(s,side*(8+random()*2));
          if(!clear(p.x,p.z))continue;
          props.push({...p,variant:"rock-b",routeS:s,y:-.4,yaw:random()*6.28,scale:4.5});
          props.push({...p,variant:"tree-conifer-a",routeS:s,y:1.72,yaw:random()*6.28,scale:.65});
        }
        continue;
      }
      const count=Math.ceil((end-start)/1.2),sections=Array.from({length:count+1},(_,i)=>channelSection(span,start+(end-start)*i/count,side));
      channels.push({sections});
      const trees:Prop[]=[];
      for(let i=0;i<(end-start)*7;i++){
        const s=start+random()*(end-start),u=.44+random()*.19;
        const a=channelSection(span,s,side),p=bankPoint(a,u,.985);
        const slope=Math.abs(channelSection(span,s+.25,side).ridge-channelSection(span,s-.25,side).ridge)/.5;
        if(p.y<.5 || slope>Math.tan(Math.PI*25/180) || !clear(p.x,p.z) || trees.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<1.65))continue;
        const variant=random()<.7?"tree-conifer-"+["a","b","c"][Math.floor(random()*3)]:"tree-umbrella-"+(random()<.5?"a":"b");
        trees.push({...p,y:p.y-.04,variant,routeS:s,yaw:random()*6.28,scale:.82+random()*.49});
      }
      props.push(...trees);
      for(let s=start+1;s<end;s+=3+random()*2){
        const sec=channelSection(span,s,side),p=bankPoint(sec,-.07,0);
        if(clear(p.x,p.z))props.push({...p,y:-.24,variant:"rock-"+["a","b","c"][Math.floor(random()*3)],routeS:s,yaw:random()*6.28,scale:.9+random()*1.2});
      }
    }
  }
  for(const [index,f] of sleepFeatures(session).entries()){
    const random=seededRandom(session.id,"colony-"+index);
    const floor=f.top<-2,reef=f.kind==="reef", n=reef?10:floor?12:9;
    const group:Prop[]=[];
    const variants=["coral-boulder-a","coral-tiered-b","coral-table-a","coral-plate-b","sponge-tubes-a","coral-tube-a","anemone-b","coral-branch-a","glow-anemone-a","coral-boulder-b","coral-table-b","sponge-tubes-b"];
    const variantOffset=Math.floor(random()*variants.length);
    for(let attempt=0;attempt<n*16 && group.length<n;attempt++){
      const a=random()*Math.PI*2,r=Math.sqrt(random())*(floor?.84:reef?.55:.57);
      const u=Math.cos(a)*r*f.radiusX,v=Math.sin(a)*r*f.radiusZ;
      const c=Math.cos(f.yaw),sin=Math.sin(f.yaw),x=f.x+c*u-sin*v,z=f.z+sin*u+c*v;
      const frame=routeFrame(f.routeS),cross=(x-frame.x)*frame.nx+(z-frame.z)*frame.nz;
      if((floor && Math.abs(cross)<4.8) || !clear(x,z) || group.some(q=>Math.hypot(x-q.x,z-q.z)<(reef?.82:.48)))continue;
      const s=f.routeS+u;
      if(s<S_MOUTH || s>ROUTE_LENGTH-12)continue;
      const variant=reef?variants[(group.length+variantOffset)%variants.length]!:floor?"seagrass-"+(attempt%2?"a":"b"):"reed-clump-"+["a","b","c"][attempt%3];
      group.push({x,z,y:f.top,variant,routeS:s,yaw:random()*2*Math.PI,scale:reef?.59+random()*.32:.73+random()*.55,
        top:reef?-.20-random()*.34:undefined});
    }
    props.push(...group);
  }
  return {props,channels};
}
