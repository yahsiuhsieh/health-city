import type { Point } from "../loop-path.ts";
import { seededRandom } from "./random.ts";
import { JETTY_HEAD } from "./route.ts";
import { asleepSeconds,type SleepSession,type SleepStage } from "./session.ts";

export const ISLAND_M2_PER_ASLEEP_MINUTE=24;
const tau=2*Math.PI;
export const clamp01=(u:number)=>Math.max(0,Math.min(1,u));
const smooth=(u:number)=>u*u*(3-2*u);

export function noise(x:number,z:number){
  function hash(a:number,b:number){
    let h=Math.imul(a,374761393)+Math.imul(b,668265263);
    h=Math.imul(h^(h>>>13),1274126177);
    return ((h^(h>>>16))>>>0)/4294967296;
  }
  const i=Math.floor(x),j=Math.floor(z),u=smooth(x-i),v=smooth(z-j);
  return (hash(i,j)*(1-u)+hash(i+1,j)*u)*(1-v)+(hash(i,j+1)*(1-u)+hash(i+1,j+1)*u)*v;
}
function warped(x:number,z:number,seed:number){
  const a=x+1.4*noise(x+.7,z+seed),b=z+.9*noise(x+seed,z+2);
  return .56*noise(a+seed,b)+.3*noise(2.1*a,2.1*b+seed)+.14*noise(4.3*a+seed,4.3*b);
}
export function polygonArea(poly:readonly Point[]){
  return Math.abs(poly.reduce((sum,a,i)=>{const b=poly[(i+1)%poly.length]!;return sum+a[0]*b[1]-b[0]*a[1];},0))*.5;
}
export function stageMinutes(session:SleepSession){
  const totals:Record<SleepStage,number>={LIGHT:0,DEEP:0,REM:0,AWAKE:0,ASLEEP:0,RESTLESS:0,UNKNOWN:0};
  for(const span of session.segments)totals[span.stage]+=(span.end-span.start)/60;
  return totals;
}

// Sample each outline in elliptical polar coordinates. The signed distance uses
// the nearest shoreline segments, so the bands follow the tapered ends.
function outline(area:number,aspect:number,seed:number,cay:boolean){
  const count=192;
  const points:Point[]=Array.from({length:count},(_,i)=>{
    const a=tau*i/count,c=Math.cos(a),s=Math.sin(a);
    const variation=1+(cay?.28:.34)*(warped(2.3*c,2.3*s,seed)-.5);
    const spit=cay?.30*Math.exp(-((a-Math.PI)**2)/.105):0;
    return [aspect*c*(variation+spit),s*(variation+spit)];
  });
  const scale=Math.sqrt(area/polygonArea(points));
  return points.map(([x,z]):Point=>[x*scale,z*scale]);
}
function contour(local:Point[],center:Point,aspect:number){
  const polygon:Point[]=local.map(([x,z])=>[center[0]+x,center[1]+z]);
  const xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1]);
  const bounds={left:Math.min(...xs),right:Math.max(...xs),bottom:Math.min(...zs),top:Math.max(...zs)};
  function distance(x:number,z:number){
    const dx=x-center[0],dz=z-center[1];
    const angle=(Math.atan2(dz,dx/aspect)+tau)%tau;
    const i=Math.floor(angle/tau*local.length)%local.length;
    const a=local[i]!,b=local[(i+1)%local.length]!,ex=b[0]-a[0],ez=b[1]-a[1];
    const sign=Math.sign((dx-a[0])*ez-(dz-a[1])*ex);
    let squared=Infinity;
    for(let offset=-12;offset<=12;offset++){
      const k=(i+offset+local.length)%local.length,q=local[k]!,n=local[(k+1)%local.length]!;
      const vx=n[0]-q[0],vz=n[1]-q[1],px=dx-q[0],pz=dz-q[1];
      const u=clamp01((px*vx+pz*vz)/(vx*vx+vz*vz));
      squared=Math.min(squared,(px-u*vx)**2+(pz-u*vz)**2);
    }
    return sign*Math.sqrt(squared);
  }
  return {polygon,center,bounds,distance};
}
export function reefPlatform(area:number,aspect:number,seed:number,center:Point){
  return contour(outline(area,aspect,seed,false),center,aspect);
}
// Keep the approved island texture and planting fields fixed relative to the reef.
export function islandNoisePoint(x:number,z:number):Point{
  return [1144+x-(JETTY_HEAD[0]-12),-39.6+z-(JETTY_HEAD[1]-13)];
}
export function islandShape(session:SleepSession,minutes=asleepSeconds(session)/60){
  if(!Number.isFinite(minutes)||minutes<=0)throw new RangeError("Island area requires positive asleep time.");
  const area=minutes*ISLAND_M2_PER_ASLEEP_MINUTE,platformArea=Math.max(15000,area*2.5);
  const random=seededRandom(session.id,"reef-platform"),seed=random()*512;
  const reefAspect=1.85,cayAspect=1.7;
  const reefLocal=outline(platformArea,reefAspect,seed,false);
  const top=Math.max(...reefLocal.map(p=>p[1]));
  const reefCenter:Point=[JETTY_HEAD[0]-12,JETTY_HEAD[1]-13-top];
  const reef=contour(reefLocal,reefCenter,reefAspect);
  const cayLocal=outline(area,cayAspect,seed+62,true);
  const center:Point=[reefCenter[0]+.32*Math.sqrt(area/Math.PI),reef.bounds.top-26-.10*Math.sqrt(area/Math.PI)-Math.max(...cayLocal.map(p=>p[1]))];
  const cay=contour(cayLocal,center,cayAspect);
  // Find the beach on the jetty axis, including the sand spit on small cays.
  const shoreX=Math.max(cay.bounds.left+.05*(center[0]-cay.bounds.left),Math.min(center[0],JETTY_HEAD[0]));
  let shoreZ=-Infinity;
  cay.polygon.forEach((a,i)=>{
    const b=cay.polygon[(i+1)%cay.polygon.length]!;
    if((a[0]>shoreX)!==(b[0]>shoreX))shoreZ=Math.max(shoreZ,a[1]+(b[1]-a[1])*(shoreX-a[0])/(b[0]-a[0]));
  });
  const shore:Point=[shoreX,shoreZ];
  const pier:Point=[JETTY_HEAD[0],JETTY_HEAD[1]-6.15];
  function beachWidth(x:number,z:number){
    const leeward=clamp01((center[0]-x)/(center[0]-cay.bounds.left));
    const [u,v]=islandNoisePoint(x,z);
    return Math.min(4+8*leeward+2*noise(u*.04+seed,v*.04),Math.sqrt(area)*.20);
  }
  function elevation(x:number,z:number){
    const inland=Math.max(0,-cay.distance(x,z)),width=beachWidth(x,z);
    const [u,v]=islandNoisePoint(x,z);
    const berm=1.0+.48*noise(u*.04,v*.04+seed);
    const interior=(area>15000?2.9:2.0)+1.25*noise(u*.025+seed,v*.025);
    return berm*Math.min(1,inland/width)+smooth(clamp01((inland-width)/13))*(interior-berm);
  }
  return {...cay,area,radius:Math.sqrt(area/Math.PI),reef,platformArea,shore,pier,seed,beachWidth,elevation};
}
export type IslandTerrain=ReturnType<typeof islandShape>;
