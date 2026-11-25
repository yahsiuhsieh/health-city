import {surfaceHeight} from "./city/terrain.ts";
import {ridgeFootX} from "./city/ridge-foot.ts";

export const ridgeLength=146;
export function elevation(bpm:number) {
  return bpm===0 ? 8 : 8+48/(1+(100/bpm)**2);
}
export function ridgeProfile(means:(number|null)[]) {
  const n=means.length;
  const index=(u:number)=>Math.max(0,Math.min(n-1,Math.floor(u*n)));
  const ranges:{start:number;end:number;valid:boolean}[]=[];
  for(let i=0;i<n;i++){
    const valid=means[i]!==null,prev=ranges.at(-1);
    if(prev?.valid===valid)prev.end=i+1;
    else ranges.push({start:i,end:i+1,valid});
  }
  const heights=means.map(value => value===null ? null : elevation(value));
  const slopes=heights.map((center,i)=>{
    const left=heights[i-1],right=heights[i+1];
    if(center==null || left==null || right==null)return 0;
    const before=center-left,after=right-center;
    return before*after>0 ? 2*before*after/(before+after) : 0;
  });
  function height(u:number){
    const i=index(u),center=heights[i];
    if(center==null)return 0;
    const station=u*n-.5,left=Math.floor(station),t=station-left;
    const a=heights[left],b=heights[left+1];
    if(a==null || b==null)return center;
    return a+(b-a)*t*t*(3-2*t)+t*(1-t)*((1-t)*slopes[left]!-t*slopes[left+1]!);
  }
  const z=(u:number)=>(.5-u)*ridgeLength;
  const x=(u:number)=>ridgeFootX(z(u))-19+1.3*Math.sin(6*u)+.7*Math.cos(13*u);
  // Limit vertical changes on the railway without smoothing the data crest.
  const shelves=means.map((v,i)=>{
    if(v===null)return 0;
    let total=0,count=0;
    for(const sign of [-1,1]) for(let j=1;j<=12;j++){
      const near=means[i+sign*j];if(near==null)break;
      total+=elevation(near);count++;
    }
    return 4+(elevation(v)+total)/(count+1)*.36;
  });
  // Missing measurements leave a gap in the ridge. The railway connects its two shoulders.
  for (const gap of ranges.filter(r=>!r.valid)) {
    const before=shelves[gap.start-1] || shelves[gap.end] || 3;
    const after=shelves[gap.end] || before;
    for(let i=gap.start;i<gap.end;i++) shelves[i]=before+(after-before)*(i+.5-gap.start)/(gap.end-gap.start);
  }
  function track(u:number){
    const i=index(u),delta=u*n-i-.5,a=shelves[i]??0,b=shelves[i+Math.sign(delta)]||a;
    return {x:x(u)+9,y:a+(b-a)*Math.min(.5,Math.abs(delta)),z:z(u)};
  }
  return {ranges,index,height,x,z,track};
}

export const ridgeBackX=-256;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>x*x*(3-2*x);
function terrainNoise(u:number){
  const i=Math.floor(u),fraction=u-i;
  const sample=(k:number)=>{
    let h=Math.imul(k^7927,0x45d9f3b);
    h=Math.imul(h^(h>>>16),0x45d9f3b);
    return (h>>>0)/2147483648-1;
  };
  return sample(i)+(sample(i+1)-sample(i))*smooth(fraction);
}
export function ridgeSurface(profile:ReturnType<typeof ridgeProfile>,u:number,x:number){
  const z=profile.z(u),toe=ridgeFootX(z),crest=profile.x(u);
  const rail=profile.track(u),height=profile.height(u),grade=surfaceHeight(toe,z);
  if(!height)return grade;
  const back=x<crest;
  const t=clamp((x-crest)/((back?ridgeBackX:toe)-crest));
  const gully=terrainNoise(z*.18+t*1.5)+.42*terrainNoise(z*.49+t*3.7);
  let y=grade+(height-grade)*(1-smooth(t)) + gully*Math.sin(Math.PI*t)*1.6;
  if(!back){
    const weight=clamp((Math.abs(x-rail.x)-1.1)/4);
    y=rail.y-.11+(y-rail.y+.11)*smooth(weight);
  }
  return Math.min(height,y);
}
