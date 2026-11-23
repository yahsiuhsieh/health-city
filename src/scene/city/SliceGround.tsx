import {useEffect,useMemo} from "react";
import {BufferGeometry,Color,Float32BufferAttribute,ShapeUtils,Vector2} from "three";
import {area,crosswalks,edgeCenterline,roadSurfaces,sections,sidewalks} from "./street-graph.ts";
import type {Point} from "./street-graph.ts";
import {blockOffsetX,marketTurnLanes,sliceGraph,sliceOutline} from "./slice-plan.ts";
import {groundHeight} from "./terrain.ts";
import {palette as p} from "./palette.ts";
import {clearsFrontage,frontage,type Placement} from "./building-assembler.ts";

function makeGround() {
  const xyz:number[]=[],rgb:number[]=[];
  function polygon(poly:Point[],height:number,color:string){
    const contour=poly.map(([x,z])=>new Vector2(x,z));
    const c=new Color(color);
    for(const face of ShapeUtils.triangulateShape(contour,[]))for(const i of [...face].reverse()){
      const [x,z]=poly[i!]!;xyz.push(x,groundHeight(x,z)+height,z);rgb.push(c.r,c.g,c.b);
    }
  }
  function rect(x:number,z:number,w:number,d:number,h:number,color:string){
    polygon([[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]],h,color);
  }
  function verticalFace(a:Point,b:Point,bottom:number,top:number,color:string){
    const c=new Color(color);
    for(const [v,h] of [[a,bottom],[a,top],[b,top],[a,bottom],[b,top],[b,bottom]] as const){
      xyz.push(v[0],groundHeight(...v)+h,v[1]);rgb.push(c.r,c.g,c.b);
    }
  }
  polygon(sliceOutline,0,p.sidewalk);
  // Raise the sidewalk 0.15 m above the adjoining carriageway.
  for(const side of sidewalks(sliceGraph)){
    polygon(side.polygon,.17,p.sidewalk);polygon(side.curb,.173,p.curb);
    const half=side.curb.length/2;
    for(let i=0;i<half-1;i++){
      const a=side.curb[i]!,b=side.curb[i+1]!,color=new Color(p.curb);
      for(const [v,h] of [[a,.02],[b,.02],[b,.17],[a,.02],[b,.17],[a,.17]] as const){
        xyz.push(v[0],groundHeight(v[0],v[1])+h,v[1]);rgb.push(color.r,color.g,color.b);
      }
    }
  }
  // Concrete joints cross the footway. The carriageways cover them at junctions.
  for(let x=-90;x<=-4;x+=1.5)rect(x,-2.5,.027,89,.004,p.curb);
  for(let z=-46.5;z<=42;z+=1.5)rect(-47.5,z,87,.027,.005,p.curb);
  rect(-7.5,-2.5,7,89,.012,p.promenade);
  for(let z=-47;z<42;z+=1.2)rect(-7.5,z,7,.038,.016,p.promenadeJoint);
  for(let x=-10.4;x<-4;x+=.6)rect(x,-2.5,.022,89,.017,p.promenadeJoint);
  for(const surface of roadSurfaces(sliceGraph)){
    if(Math.abs(area(surface.polygon))>.01)polygon(surface.polygon,.022,p.asphalt);
  }
  const crossings=crosswalks(sliceGraph);
  const marketCrossing=crossings.find(c=>c.edge===marketTurnLanes[0]?.edge && c.node===marketTurnLanes[0]?.to);
  if(marketCrossing){
    const nearEdge=Math.min(...marketCrossing.polygon.map(([x])=>x));
    // Market Avenue ends here. The two eastbound lanes split before the crossing.
    const turnArrow:Point[]=[
      [0,-.64],[2.35,-.64],[2.76,-.55],[3.10,-.30],[3.32,.04],[3.42,.40],
      [4.02,.40],[3.19,1.22],[2.38,.40],[2.96,.40],[2.88,.14],[2.65,-.12],
      [2.34,-.23],[0,-.23],
    ];
    for(const lane of marketTurnLanes){
      const centerZ=lane.points[0]![1],turn=lane.lane===0?-1:1;
      polygon(turnArrow.map(([forward,side])=>[nearEdge-9+forward,centerZ+turn*side]),.041,p.marking);
    }
  }
  for(const e of sliceGraph.edges){
    const [a,b]=edgeCenterline(sliceGraph,e),dx=b![0]-a![0],dz=b![1]-a![1],len=Math.hypot(dx,dz);
    const alongX=dx!==0,s=sections[e.cls];
    const stripe=(distance:number,offset:number,length:number,width:number,col:string)=>{
      const x=a![0]+dx/len*distance-dz/len*offset,z=a![1]+dz/len*distance+dx/len*offset;
      rect(x,z,alongX?length:width,alongX?width:length,.041,col);
    };
    const reserve=10;
    if(len>2*reserve){
      const segment=len-2*reserve;
      for(const side of [-1,1]){
        stripe(len/2,side*s.road/2,segment,.19,p.curb);
        stripe(len/2,side*(s.road/2-.33),segment,.09,p.marking);
        if(e.cls==="local")stripe(len/2,side*.13,segment,.10,p.yellow);
        if(e.cls==="arterial")for(let pos=reserve+2;pos<len-reserve;pos+=9)stripe(pos,side*4.2,3,.13,p.marking);
      }
      if(s.median>0){
        let start=reserve+1.5,end=len-reserve-1.5;
        for(const crossing of crossings.filter(c=>c.edge===e.id)){
          const distances=crossing.polygon.map(([x,z])=>((x-a![0])*dx+(z-a![1])*dz)/len);
          if(crossing.node===e.from)start=Math.max(start,Math.max(...distances)+1);
          else end=Math.min(end,Math.min(...distances)-1);
        }
        const radius=s.median/2;
        if(end-start<s.median)continue;
        const outline=(r:number):Point[]=>{
          const points:Point[]=[];
          for(const [center,angle] of [[end-radius,-Math.PI/2],[start+radius,Math.PI/2]] as const){
            for(let i=0;i<=8;i++){
              const theta=angle+i*Math.PI/8,u=center+r*Math.cos(theta),v=r*Math.sin(theta);
              points.push([a![0]+(dx*u-dz*v)/len,a![1]+(dz*u+dx*v)/len]);
            }
          }
          return points;
        };
        const outer=outline(radius),inner=outline(radius-.18);
        const curbTop=.022+.15,grassTop=curbTop-.035;
        polygon(inner,grassTop,p.planting);
        for(const [i,point] of outer.entries()){
          const j=(i+1)%outer.length;
          polygon([point,outer[j]!,inner[j]!,inner[i]!],curbTop,p.curb);
          verticalFace(point,outer[j]!,.022,curbTop,p.curb);
          verticalFace(inner[j]!,inner[i]!,grassTop,curbTop,p.curb);
        }
      }
    }
  }
  for(const c of crossings){
    const [a,b]=c.path as [Point,Point],length=Math.hypot(b[0]-a[0],b[1]-a[1]),horizontal=Math.abs(b[0]-a[0])>.1;
    for(let i=.55;i<length;i++){
      const t=i/length;rect(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,horizontal?.5:3,horizontal?3:.5,.05,p.marking);
    }
  }
  rect(-59,-13.2,24.2,11.4,.05,p.courtyard);
  rect(-55,35,40,11.5,.06,p.lawn);
  const g=new BufferGeometry();g.setAttribute("position",new Float32BufferAttribute(xyz,3));g.setAttribute("color",new Float32BufferAttribute(rgb,3));
  g.computeVertexNormals();return g;
}
export function SliceGround(){
  const geometry=useMemo(makeGround,[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial vertexColors roughness={.96}/></mesh>;
}
export function sliceFurniture():Placement[]{
  const out:Placement[]=[];
  function place(module:string,x:number,z:number,y:number,size:[number,number,number],color="#ffffff",yaw=0){
    out.push({module,at:[x,y,z],size,yaw,color});
  }
  function box(x:number,z:number,w:number,h:number,d:number,y:number,color:string){
    place("wall",x,z,y,[w,h,d],color);
  }
  const tree=(x:number,z:number,index:number)=>{
    const s=.88+(index%4)*.08,y=groundHeight(x,z)+.09;
    if(!clearsFrontage(x,z,3.4*s,frontage.slice(0,3)))return;
    box(x,z,2,.06,2,y,p.soil);place("street-tree",x,z,y,[s,s,s],"#ffffff",index*.69);
  };
  // Retaining faces close the demonstration block down to the submerged footing.
  for(const [i,a] of sliceOutline.entries()){
    const b=sliceOutline[(i+1)%sliceOutline.length]!,horizontal=a[1]===b[1];
    const len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(len/2);
    for(let k=0;k<n;k++){
      const t=(k+.5)/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,g=groundHeight(x,z);
      box(x,z,horizontal?len/n:.26,g+2.8,horizontal?.26:len/n,-2.8,p.seawall);

    }
  }
  // A short promenade occupies the existing quay. Leave a stair down to each pier.
  const wallX = -4 - blockOffsetX;
  for(let z=10;z<42;z+=.5){
    const atPier = [13.5,23.5,33.5].some(pier=>Math.abs(z+.25-pier)<1);
    const center = z+.25;
    if(atPier){
      for(let step=0;step<6;step++)
        box(wallX-.18-step*.35,center,.35,.15*(step+1),.5,.55,p.promenade);
    }else{
      box(wallX-1.05,center,2.1,1.05,.5,.55,p.promenade);
      box(wallX,center,.23,2.2,.5,-.6,p.seawall);
      box(wallX+.03,center,.25,.4,.5,-.025,p.wetWall);
      for(const y of [1.99,2.63])box(wallX-.15,center,.087,.07,.5,y,"#45544c");
      if(z%2===0)box(wallX-.15,center,.11,1.04,.11,1.6,"#3c4b47");
    }
  }
  for(let z=-35;z<42;z+=26)place("bench",-7.6,z,1.67,[1,1,1],"#ffffff",-Math.PI/2);
  for(const [i,z] of [-33,-23,-13,-3,35].entries())tree(-10,z,i);
  for(const [i,x] of [-71,-61,-51,-41].entries())tree(x,28,i);
  for(const [i,x] of [-72,-62,-52,-42].entries())tree(x,8.8,i+2);
  for(const [i,x] of [-70,-56,-43].entries())tree(x,36,i+4);
  for(const [i,z] of [-28,-16,-4,6,32].entries())tree(-77,z,i);
  // Long shop signs span the bays of the ground floor without covering its glazing.
  for(const [x,width] of [[-66,12],[-50.1,13.1],[-36.8,8]] as const)
    box(x,7.46,width,.56,.16,groundHeight(x,7)+3.83,"#344e48");
  return out;
}
