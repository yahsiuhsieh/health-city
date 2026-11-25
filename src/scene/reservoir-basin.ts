// Site A. Local y=0 is the downstream toe. Local +z faces the north coast.
import {BufferGeometry,Color,Float32BufferAttribute} from "three";

import {palette} from "./city/palette.ts";
import {surfaceHeight} from "./city/terrain.ts";

export const damSite={x:-218,y:5.25,z:148,yaw:-.29};
export const upstreamFace=(x:number)=>6-x*x/240;
const spokes=80;
function localGrade(x:number,z:number){
  const wx=damSite.x+x*Math.cos(damSite.yaw)+z*Math.sin(damSite.yaw);
  const wz=damSite.z-x*Math.sin(damSite.yaw)+z*Math.cos(damSite.yaw);
  return surfaceHeight(wx,wz)-damSite.y-.08;
}
export function hillside(a:number,r:number){
  const wave=Math.sin(a)*(Math.sin(5*a)*.091+Math.cos(8*a)*.043);
  const x=(34+8*Math.sin(a))*(1+wave)*Math.cos(a)*r;
  const z=upstreamFace(x)-Math.sin(a)*(39+3*Math.cos(3*a)+2.4*Math.sin(8*a))*r;
  const summit=23.8+2.2*Math.sin(a*7+.6)+1.25*Math.sin(a*13);
  const t=Math.min(1,Math.max(0,(r-1.12)/.55));
  const blend=t*t*(3-2*t);
  const y=r<=1?1+19*r*r:r<=1.12?20+(r-1)/.12*(summit-20):
    summit+(localGrade(x,z)-summit)*blend;
  return {x,y,z};
}
export function basinGeometry(level:number|null,unavailable=false){
  const water=level!==null;
  const radii=water?[0,.35,.68,.85,.95,1].map(r=>r*Math.sqrt((level-1)/19)):
    [...Array.from({length:31},(_,i)=>i/30),1.035,1.07,1.12,1.16,1.22,1.28,1.35,1.43,1.51,1.59,1.67];
  const positions:number[]=[],colors:number[]=[],indices:number[]=[];
  const lawn=new Color(palette.lawnShade);
  const tint=new Color(),deep=new Color("#205b60"),shallow=new Color("#72aaa0");
  for(const [j,r] of radii.entries())for(let i=0;i<=spokes;i++){
    const a=Math.PI*i/spokes,p=hillside(a,r);
    positions.push(p.x,level??p.y,p.z);
    if(level!==null)tint.copy(shallow).lerp(deep,Math.min(1,(level-p.y)/3.5));
    else if(r<=1.015)tint.set(unavailable?"#99a4a1":p.y<10?"#a59c80":p.y<16?"#c1af89":"#d6c3a1");
    else tint.set(r<1.07?"#8e9868":r<1.2?"#759161":"#82996b");
    tint.multiplyScalar(1+.035*Math.sin(11*a+19*r)+.023*Math.cos(27*a-33*r)-(water?0:j%4===1?.065:0));
    if(!water&&r>1.28)tint.lerp(lawn,Math.min(1,(r-1.28)/.31));
    colors.push(tint.r,tint.g,tint.b);
    if(i&&j){const n=j*(spokes+1)+i,m=n-spokes-1;indices.push(m-1,n-1,n,m-1,n,m);}
  }
  // Return each end of the valley to grade around the gravity dam abutments.
  if(!water)for(const a of [0,Math.PI]){
    const start=positions.length/3;
    for(const [j,r] of radii.entries()){
      const p=hillside(a,r);
      for(let k=0;k<=5;k++){
        const t=k/5,extent=10.5+1.8*Math.sin(r*7);
        const z=p.z+t*extent;
        positions.push(p.x,p.y+(localGrade(p.x,z)-p.y)*Math.pow(t,3.5),z);
        tint.set(r<1.03?"#a89c80":"#84966a").multiplyScalar(.94+.04*Math.cos(r*11+k));
        colors.push(tint.r,tint.g,tint.b);
        if(j&&k){const n=start+j*6+k;indices.push(n-7,n-6,n,n-7,n,n-1);}
      }
    }
  }
  const g=new BufferGeometry();
  g.setAttribute("position",new Float32BufferAttribute(positions,3));g.setAttribute("color",new Float32BufferAttribute(colors,3));
  g.setIndex(indices);g.computeVertexNormals();return g;
}
