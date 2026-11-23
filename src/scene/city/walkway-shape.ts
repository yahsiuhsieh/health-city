import {CatmullRomCurve3,Vector3} from "three";
import {offsetLine,type Point} from "./street-graph.ts";

export const walkGrade=.16;
export const plotGroundGrade=.045;

export function smoothWalk(points:Point[],closed=false,steps=points.length*4):Point[]{
  const curve=new CatmullRomCurve3(points.map(([x,z])=>new Vector3(x,0,z)),closed);
  const line=curve.getSpacedPoints(steps);
  if(closed)line.pop();
  return line.map(v=>[v.x,v.z]);
}

export function ribbon(line:Point[],halfWidth:number|((p:Point)=>number),closed=false,extraSide?:(p:Point)=>number):Point[][]{
  const points=closed?[line.at(-1)!,...line,line[0]!,line[1]!]:line;
  const unit=offsetLine(points,1);
  const sides=points.map(([x,z],i)=>{
    const w=typeof halfWidth==="number"?halfWidth:halfWidth([x,z]);
    const dx=unit[i]![0]-x,dz=unit[i]![1]-z,extra=extraSide?.([x,z])??0;
    const left=w+Math.max(0,extra),right=w+Math.max(0,-extra);
    return [[x+dx*left,z+dz*left],[x-dx*right,z-dz*right]] as [Point,Point];
  });
  const start=closed?1:0,segments=closed?line.length:line.length-1;
  return Array.from({length:segments},(_,j)=>{
    const i=start+j;
    return [sides[i]![0],sides[i+1]![0],sides[i+1]![1],sides[i]![1]];
  });
}

// The path widens gradually into a rounded seat at the closed end.
export function parkPaving(line:Point[],width:(p:Point)=>number=()=>.82,sideSeat?:Point):Point[][]{
  const [x,z]=line[0]!, next=line[1]!;
  const direction=Math.atan2(next[1]-z,next[0]-x), radius=1.55;
  const cap:Point[]=Array.from({length:17},(_,i)=>{
    const a=direction+Math.PI/2+i*Math.PI/16;
    return [x+Math.cos(a)*radius,z+Math.sin(a)*radius];
  });
  // Widen the edge beside the second bench and ease it back into the walk.
  let seatStation:Point=[0,0],seatDistance=Infinity,turn=0;
  if(sideSeat)for(let i=1;i<line.length;i++){
    const a=line[i-1]!,b=line[i]!,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    if(!length)continue;
    const u=Math.max(0,Math.min(1,((sideSeat[0]-a[0])*dx+(sideSeat[1]-a[1])*dz)/(length*length)));
    const hit:Point=[a[0]+u*dx,a[1]+u*dz],distance=Math.hypot(hit[0]-sideSeat[0],hit[1]-sideSeat[1]);
    if(distance<seatDistance){
      seatDistance=distance;seatStation=hit;turn=Math.sign(dx*(sideSeat[1]-a[1])-dz*(sideSeat[0]-a[0]));
    }
  }
  const seatEdge=(p:Point)=>{
    if(!sideSeat)return 0;
    const t=Math.max(0,Math.min(1,(Math.hypot(p[0]-seatStation[0],p[1]-seatStation[1])-1.3)/2));
    return turn*Math.max(0,seatDistance+.65-.82)*(1-t*t*(3-2*t));
  };
  return [cap,...ribbon(line,p=>{
    const t=Math.min(1,Math.hypot(p[0]-x,p[1]-z)/3.2);
    return Math.max(width(p),radius-(radius-.82)*t*t*(3-2*t));
  },false,seatEdge)];
}
