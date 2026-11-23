import {Color} from "three";
import type {Placement,Triple} from "./building-assembler.ts";
import type {InterimForm} from "./interim-layout.ts";
import {gardens,courts,gardenYaw,openSpaceVariant} from "./open-space-designs.ts";
import {plotGroundGrade,walkGrade} from "./walkway-shape.ts";
import {surfaceHeight} from "./terrain.ts";

export type InterimSite={id:number;x:number;z:number;yaw:number;width:number;depth:number;interimForm:InterimForm;cornerSide:number};
const masonry=["#a86a52","#d8c7a6","#9a5e4a","#c9b48e","#b9a88a"];
export function assembleInterim(site:InterimSite,night:boolean,neutral=false,standaloneTrail=false):Placement[] {
  const items:Placement[]=[],{id,interimForm:form}=site;
  const yaw=!neutral&&(form==="park"||form==="plaza")?gardenYaw(id,site.yaw):site.yaw;
  const base=surfaceHeight(site.x-site.width/2,site.z)+.065;
  const wx=(u:number,v:number)=>site.x+Math.cos(yaw)*u+Math.sin(yaw)*v;
  const wz=(u:number,v:number)=>site.z-Math.sin(yaw)*u+Math.cos(yaw)*v;
  const landscape=neutral || form==="park" || form==="plaza";
  function add(module:string,u:number,h:number,v:number,size:Triple=[1,1,1],color="#ffffff",turn=0){
    const x=wx(u,v),z=wz(u,v);
    const floor=landscape?surfaceHeight(x,z)+plotGroundGrade:base;
    const grade=landscape && (module==="wall" || module.includes("-ground-") || module.includes("-trail-")) ? surfaceHeight(x+.5,z)-surfaceHeight(x-.5,z) : 0;
    items.push({plotId:id,module,at:[x,floor+h,z],yaw:yaw+turn,size,color,grade});
  }
  const slab=(u:number,v:number,w:number,d:number,top:number,color:string)=>
    add("wall",u,top-.43,v,[w,.43,d],color);
  const tree=(u:number,v:number,scale:number,h=0)=>add("street-tree",u,h,v,[scale,scale,scale],"#f5f4e4",id*.76+u);
  if(neutral){slab(0,0,site.width-.16,site.depth-.16,.02,"#bcbeb8");return items;}
  if(form==="park"||form==="plaza"){
    const plaza=form==="plaza";
    const variant=openSpaceVariant(form,id),design=(plaza?courts:gardens)[variant]!;
    add(form+"-ground-"+variant,0,0,0);
    if(standaloneTrail)add(form+"-trail-"+variant,0,0,0);
    const paving=walkGrade-plotGroundGrade;
    if(design.fountain){
      const [u,v,w,d]=design.fountain;
      add("fountain-basin",u,paving,v,[w,1,d]);
    }
    const count=plaza?2+id%3:3+id%4;
    for(const [u,v] of design.trees.slice(0,count)){
      if(plaza)add("round-planter",u,paving,v);
      tree(u,v,.60+.06*((id+Math.abs(Math.floor(u)))%4),plaza?paving+.455:.03);
    }
    for(const [i,[u,v,turn]] of design.benches.entries()){
      if(i===design.endBench){
        const start=design.path[0]!,next=design.path[1]!;
        add("bench",start[0],paving,start[1],[.88,.88,.88],"#ffffff",Math.atan2(next[0]-start[0],next[1]-start[1]));
      }else add("bench",u,paving,v,[.88,.88,.88],"#ffffff",turn);
    }
    return items;
  }
  // The front apron joins the shop threshold. The rear yard has a separate service door.
  slab(0,8.6,19.6,2.6,.06,"#b5afa0");
  tree(-6.6,-6.5,.71);
  add("yard-shed-"+id%2,5.5,0,-6.4);
  add("cafe-table",-6,.07,8.8,[.82,.82,.82]);
  const color=(i:number)=>"#"+new Color(masonry[(id+i)%masonry.length]!).multiplyScalar(.95+((id*47+i*23)%101)/1000).getHexString();
  if(form==="hall"){
    add("market-hall-"+Math.floor(id/8)%2,0,0,1.9,[1,1,1],id%3===0?"#ffffff":"#faf7f4");
    slab(0,1.9,15.5,10.9,.06,"#ae9e87");
    for(const [i,u] of [-4.8,0,4.8].entries())add("market-stall-"+(id+i)%3,u,.07,4.85);
    if(night){
      for(const side of [-1,1])for(const v of [-3.7,-1.25,1.25,3.7])
        add("lit-glazing",side*7.66,4.64,1.9+v,[2.22,.97,1],"#ffffff",side*Math.PI/2);
      for(const u of [-4.8,0,4.8])add("lit-glazing",u,2.31,5.31,[1.65,.13,1]);
    }
    return items;
  }
  const count=form==="shophouse"?2+id%2:1;
  const totalWidth=form==="shophouse"?19.6:form==="bank"?15.3:14.6;
  for(let i=0;i<count;i++){
    const w=totalWidth/count, side=form==="walkup"?site.cornerSide:0;
    const cx=(i+.5)*w-totalWidth/2+side*1.9,depth=10.1,front=7.35,back=front-depth;
    const floors=form==="bank"?2:form==="walkup"?3:2+((i+id)%2);
    const ground=form==="bank"?4.1:3.45,upper=2.82,h=ground+(floors-1)*upper;
    add("wall",cx,-.35,(front+back)/2,[w-.035,h+.35,depth],color(i));
    const facade=(face:number,u:number,y:number,offset:number,module:string,scale:Triple=[1,1,1])=>{
      const a=face*Math.PI/2,dist=(face%2?w:depth)/2+offset;
      add(module,cx+Math.cos(a)*u+Math.sin(a)*dist,y,(front+back)/2-Math.sin(a)*u+Math.cos(a)*dist,scale,"#ffffff",a);
    };
    const upperLights:{rank:number;light:()=>void}[]=[];
    for(let face=0;face<4;face++){
      if((face===1&&i<count-1)||(face===3&&i>0))continue;
      const span=face%2?depth:w, bw=3.2, bays=Math.max(1,Math.floor(span/bw));
      const retail=face===0||(side!==0&&face===(side>0?1:3));
      for(let b=0;b<bays;b++){
        const u=(b+.5-bays/2)*bw,variant=(id+i+b)%3;
        if(form==="bank" && face===0 && b===Math.floor(bays/2))facade(face,u,0,.10,"bank-front",[bw/4.1,1,1]);
        else if(retail && form!=="bank"){
          facade(face,u,0,.14,"gf-timber-shopfront-"+variant,[bw/3.2,1,1]);
          if(night)facade(face,u-.46*bw/3.2,1.62,.23,"lit-glazing",[1.78*bw/3.2,1.82,1]);
        }else facade(face,u,.06,.07,"upper-sash-window-"+variant,[form==="bank"?1.29:1,ground/3.0,1]);
        for(let f=1;f<floors;f++){
          const level=ground+(f-1)*upper;
          facade(face,u,level,.035,"upper-sash-window-"+variant);
          if(night)upperLights.push({rank:((id+1)*1327+(f+2)*293+(b+1)*67+face*173+i*19)%100,
            light:()=>{for(const sign of [-1,1])
              facade(face,u+sign*(1.18+variant*.16)/4,level+1.54,.146,"lit-glazing",[(1.18+variant*.16)/2-.07,1.65,1]);}});

        }
      }
    }
    upperLights.sort((a,b)=>a.rank-b.rank).slice(0,Math.round(upperLights.length*.39)).forEach(w=>w.light());
    add("wall",cx,h-.12,(front+back)/2,[w,.21,depth+.13],"#cbb99c");
    if(form==="bank"){
      add("wall",cx,h+.08,(front+back)/2,[w-.28,.26,depth-.25],"#827c6d");
    }else{
      add("pitched-roof-terrace-"+(i+id)%2,cx,h+.08,(front+back)/2,[w/6,1,depth/10]);
      add("chimney-"+(id+i)%2,cx-w*.25,h+1.13,(front+back)/2-.9);
    }
  }
  return items;
}
