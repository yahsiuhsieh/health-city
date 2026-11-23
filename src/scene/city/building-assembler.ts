import { palette } from "./palette.ts";
import { plinthHeight } from "./terrain.ts";

export type Triple=[number,number,number];
export interface Placement {plotId?:number;grade?:number;module:string; at:Triple; size:Triple; yaw:number; color:string}
export interface Building {x:number;z:number;w:number;d:number;floors:number;style:number;shopSide:number;wallColor?:string;kitVariant?:number;cornerShopSide?:number}
export const frontage:Building[]=[
  {x:-66,z:1,w:15.2,d:12,floors:5,style:0,shopSide:0},
  {x:-50.1,z:.6,w:15.6,d:12.8,floors:7,style:1,shopSide:0},
  {x:-36.8,z:-.4,w:10.5,d:14.8,floors:6,style:2,shopSide:0,cornerShopSide:1},
  {x:-37.6,z:-16.3,w:12,d:15.5,floors:5,style:3,shopSide:1},
  {x:-39,z:-28,w:14.8,d:7.5,floors:4,style:0,shopSide:1},
];

const facadeNormals = [[0,1],[1,0],[0,-1],[-1,0]] as const;
const awningReach = 1.6;
export function clearsFrontage(x:number,z:number,radius:number,buildings:Building[]){
  return buildings.every(b=>Math.hypot(Math.max(0,Math.abs(x-b.x)-b.w/2),
    Math.max(0,Math.abs(z-b.z)-b.d/2))>radius+awningReach+.15);
}
const parapetTop = 1.03;

export function assembleBlock(buildings:Building[],night:boolean) {
  const items:Placement[]=[];
  function add(module:string,at:Triple,size:Triple=[1,1,1],yaw=0,color="#ffffff"){items.push({module,at,size,yaw,color});}
  const lots = buildings.map(b => ({
    ...b,
    base: plinthHeight([[b.x-b.w/2,b.z],[b.x+b.w/2,b.z]])+.16,
    height: 4.2+(b.floors-1)*3.2,
  }));
  for(const [id,b] of lots.entries()){
    const {base:y,height:h}=b;
    const face=["#fff8e7","#e7c79e","#f0c9bb","#d2e3d8"][b.style%4]!;
    const tint=b.wallColor??palette.downtown[b.style%4]!, trim=["#c7baa1","#c5a980","#c6b1a5","#acb6ab"][b.style%4]!;
    add("wall",[b.x,y-.5,b.z],[b.w,.6,b.d],0,"#887e6b");
    add("wall",[b.x,y,b.z],[b.w,h,b.d],0,tint);
    add("wall",[b.x,y+h-.15,b.z],[b.w,.4,b.d],0,trim);
    add("wall",[b.x,y+h+.24,b.z],[b.w-.35,.14,b.d-.35],0,"#7e8076");
    add(b.kitVariant!==undefined?"roof-equipment-"+b.kitVariant:"roof-vent",[b.x+b.w*.24,y+h+.38,b.z-b.d*.22]);
    add("wall",[b.x-b.w*.2,y+h+.34,b.z],[3.3,1.95,2.7],0,trim);
    for(const [side,[nx,nz]] of facadeNormals.entries()){
      const yaw=side*Math.PI/2,width=side%2?b.d:b.w,depth=side%2?b.w:b.d;
      const world=(u:number,v:number,layer:number):Triple=>[b.x+nz*u+nx*(depth/2+layer),y+v,b.z-nx*u+nz*(depth/2+layer)];
      const neighbors=lots.flatMap(other=>{
        const dx=other.x-b.x,dz=other.z-b.z;
        const gap=nx*dx+nz*dz-(depth+(side%2?other.w:other.d))/2;
        if(gap < -0.0001 || gap > 2*awningReach) return [];
        const center=nz*dx-nx*dz,half=(side%2?other.d:other.w)/2;
        return [{start:center-half,end:center+half,top:other.base+other.height+parapetTop}];
      });
      const retail=side===b.shopSide || side===b.cornerShopSide;
      const pier=retail?.46:0;
      const usableWidth=width-2*pier;
      const count=Math.max(1,Math.round(width/3.2)),bay=usableWidth/count;
      add("wall",world(0,h+.38,-.13),[width,.65,.30],yaw,tint);
      if(b.kitVariant!==undefined){
        add("cornice-"+b.kitVariant%3,world(0,h,-.12),[width,1,1],yaw,trim);
        add("string-course-"+b.kitVariant%2,world(0,4,-.08),[width,1,1],yaw,trim);
      }
      if(retail)for(const end of [-1,1]){
        add("wall",world(end*(width-pier)/2,0,.04),[pier,h,.32],yaw,trim);
      }
      for(let i=0;i<count;i++){
        const u=(i+.5)*bay-usableWidth/2;
        let clearAbove=-Infinity;
        for(const neighbor of neighbors){
          if(neighbor.start<u+bay/2 && neighbor.end>u-bay/2) clearAbove=Math.max(clearAbove,neighbor.top);
        }
        if(y>=clearAbove){
          const frontage=retail&&i!==Math.floor(count/2)?"gf-shopfront":"gf-entrance";
          const module=b.kitVariant===undefined?frontage:frontage==="gf-entrance"?"gf-entrance-"+b.kitVariant%2:"gf-shopfront-"+b.kitVariant%4;
          add(module,world(u,0,.29),[bay/3.2,1,1],yaw,face);
          add("wall",world(u,4.08,.07),[bay,.26,.46],yaw,trim);
        }
        for(let f=1;f<b.floors;f++){
          const v=4.2+(f-1)*3.2,balcony=b.style!==1 && ((i+b.style)%3===0||b.style===3)&&f>1;
          if(y+v<clearAbove)continue;
          const module=balcony?"upper-balcony":"upper-window";
          add(b.kitVariant===undefined?module:module+"-"+(b.kitVariant%(balcony?2:5)),world(u,v,.29),[bay/3.2,1,1],yaw,face);
          const hash=((id+1)*1327+(f+2)*293+(i+1)*67+side*173)>>>0;
          if(night && hash%100<39)for(const sign of [-1,1]){
            add("lit-glazing",world(u+sign*(balcony?.655:.5675)*bay/3.2,v+1.77,.34),[(balcony?1.18:1.01)*bay/3.2,1.98,1],yaw);
          }
        }
      }
    }
  }
  return items;
}


// One Art Deco family demonstrates the podium, stacked floors, setbacks, and crown.
export function assembleDeco(x:number,z:number,night:boolean):Placement[] {
  const items:Placement[]=[],base=plinthHeight([[x-11,z],[x+11,z]])+.16;
  const add=(module:string,u:number,h:number,v:number,size:Triple,color="#ffffff",yaw=0)=>
    items.push({module,at:[x+u,base+h,z+v],size,color,yaw});
  const band=(h:number,w:number,d:number,t:number,color:string)=>add("wall",0,h,0,[w,t,d],color);
  for(let floor=0;floor<16;floor++){
    const podium=floor<4,w=podium?22:floor<10?19.3:floor<13?16:floor<15?12:8.2;
    const d=podium?20:floor<10?18.1:floor<13?15:floor<15?11:7.4,h=3.8*floor;
    band(h,w,d,3.8,"#c7b799");
    if([3,9,12,14,15].includes(floor))band(h+3.53,w+.6,d+.6,.27,"#ddc598");
    for(let side=0;side<4;side++){
      const a=side*Math.PI/2,nx=Math.sin(a),nz=Math.cos(a),width=side%2?d:w,deep=side%2?w:d;
      const n=Math.round(width/2.3),bay=width/n;
      for(let i=0;i<n;i++){
        const u=(i+.5)*bay-width/2,fx=nz*u+nx*(deep/2+.13),fz=-nx*u+nz*(deep/2+.13);
        const lobby=floor===0 && Math.abs(u)<3.1;
        add(lobby?"gf-entrance":"deco-floor-bay",fx,h,fz,[bay/(lobby?3.2:2.3),lobby?3.8/4.2:1,1],"#ffffff",a);
        if(night && !lobby && (i*67+floor*31+side*17)%100<36)
          for(const s of [-1,1])add("lit-glazing",fx+nz*s*.46*bay/2.3+nx*.18,h+1.94,fz-nx*s*.46*bay/2.3+nz*.18,[bay*.35,2.46,1],"#ffffff",a);
      }
    }
  }
  band(60.8,6.3,5.4,1.45,"#937d56");band(62.25,4.5,3.8,1.1,"#b59b6c");
  band(63.35,2.6,2.4,.85,"#9e8052");band(64.2,1.3,1.3,.4,"#b99a62");
  return items;
}
