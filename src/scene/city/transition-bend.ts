import type {Point} from "./street-graph.ts";

// The first and last three controls are equally spaced on the approach tangents.
// Both endpoint accelerations are zero, so their signed curvature matches a straight.
export function transitionBend(start:Point,incoming:Point,end:Point,outgoing:Point,handle:number){
  const along=(p:Point,v:Point,k:number):Point=>[p[0]+k*v[0],p[1]+k*v[1]];
  const controls=[start,along(start,incoming,handle),along(start,incoming,2*handle),
    along(end,outgoing,-2*handle),along(end,outgoing,-handle),end];
  const derivative=(p:Point[])=>p.slice(1).map(([x,z],i):Point=>[(x-p[i]![0])*(p.length-1),(z-p[i]![1])*(p.length-1)]);
  const velocity=derivative(controls),acceleration=derivative(velocity);
  function at(p:Point[],t:number):Point{
    const q=p.map(v=>[...v] as Point);
    for(let n=q.length-1;n>0;n--)for(let i=0;i<n;i++){
      const a=q[i]!,b=q[i+1]!;
      a[0]+=(b[0]-a[0])*t;a[1]+=(b[1]-a[1])*t;
    }
    return q[0]!;
  }
  return {
    point:(t:number)=>at(controls,t),
    tangent:(t:number)=>at(velocity,t),
    curvature(t:number){
      const [dx,dz]=at(velocity,t),[ddx,ddz]=at(acceleration,t);
      return (dx*ddz-dz*ddx)/Math.hypot(dx,dz)**3;
    },
  };
}
