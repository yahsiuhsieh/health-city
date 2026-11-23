import {ShapeUtils,Vector2} from "three";
import {area,type Point} from "./street-graph.ts";

function triangles(polygon:Point[]){
  return ShapeUtils.triangulateShape(polygon.map(([x,z])=>new Vector2(x,z)),[]).map(face=>face.map(i=>polygon[i]!));
}
function bounds(p:Point[]){
  return [Math.min(...p.map(v=>v[0])),Math.max(...p.map(v=>v[0])),Math.min(...p.map(v=>v[1])),Math.max(...p.map(v=>v[1]))] as const;
}
// Subtract the paved carriageway from footways where unequal street widths meet.
export function footwayClipper(roads:{polygon:Point[]}[]){
  const significant=(poly:Point[])=>poly.length>=3 && Math.abs(area(poly))>1e-8;
  const cutters:{points:Point[];box:ReturnType<typeof bounds>}[]=[];
  function reserve(polygon:Point[]){
    for(const points of triangles(polygon).filter(significant))cutters.push({points,box:bounds(points)});
  }
  for(const road of roads)reserve(road.polygon);
  const cut=(polygon:Point[])=>triangles(polygon).flatMap(triangle=>{
    let pieces=[triangle];
    const box=bounds(triangle);
    for(const cutter of cutters){
      const [l,r,b,t]=cutter.box;
      if(!pieces.length || l>=box[1] || r<=box[0] || b>=box[3] || t<=box[2])continue;
      pieces=pieces.flatMap(piece=>{
        // Shared edges only touch. Do not repeatedly subdivide them into slivers.
        const separate=(a:Point[],b:Point[])=>a.some((p,i)=>{
          const q=a[(i+1)%a.length]!,dx=q[0]-p[0],dz=q[1]-p[1],len=Math.hypot(dx,dz);
          return len>1e-8 && b.every(v=>dx*(v[1]-p[1])-dz*(v[0]-p[0])<=len*1e-8);
        });
        if(separate(piece,cutter.points)||separate(cutter.points,piece))return [piece];
        let inside=piece;
        const outside:Point[][]=[];
        for(const [i,a] of cutter.points.entries()){
          const b=cutter.points[(i+1)%3]!;
          const distance=(p:Point)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
          const remainder:Point[]=[],kept:Point[]=[];
          for(const [j,p] of inside.entries()){
            const q=inside[(j+1)%inside.length]!,dp=distance(p),dq=distance(q);
            (dp>=0?remainder:kept).push(p);
            if((dp>0&&dq<0)||(dp<0&&dq>0)){
              const u=dp/(dp-dq),hit:Point=[p[0]+(q[0]-p[0])*u,p[1]+(q[1]-p[1])*u];
              remainder.push(hit);kept.push(hit);
            }else if(dp===0)kept.push(p);
          }
          if(significant(kept))outside.push(kept);
          if(!significant(remainder))return outside;
          inside=remainder;
        }
        return outside;
      });
    }
    return pieces;
  });
  return Object.assign(cut,{reserve});
}
