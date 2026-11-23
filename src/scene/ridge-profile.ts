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
  function height(u:number){
    const i=index(u),v=means[i];
    if(v==null)return 0;
    const offset=u*n-i-.5, other=means[i+Math.sign(offset)]??v;
    // Half of a smoothstep on each side of the interval boundary.
    const t=Math.min(1,Math.abs(offset)),s=t*t*(3-2*t);
    return elevation(v)+(elevation(other)-elevation(v))*s;
  }
  const x=(u:number)=>-231+3*Math.sin(6*u)+2*Math.cos(13*u);
  const z=(u:number)=>(.5-u)*ridgeLength;
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
