import { describe, expect, it } from "vitest";
import { area,blocks,crosswalks,edgeCenterline,laneCenterlines,lots,roadSurfaces,sidewalks,turnConnectors,walkNetwork } from "./street-graph.ts";
import type { StreetGraph } from "./street-graph.ts";
import {groundHeight,plinthHeight} from "./terrain.ts";

const graph:StreetGraph={
  nodes:[{id:"a",x:0,z:0,control:"signal"},{id:"b",x:64,z:0},{id:"c",x:64,z:65},{id:"d",x:0,z:65}],
  edges:[{id:"ab",from:"a",to:"b",cls:"arterial"},{id:"bc",from:"b",to:"c",cls:"local"},{id:"cd",from:"c",to:"d",cls:"local"},{id:"da",from:"d",to:"a",cls:"local"}],
};
describe("street geometry in metres",()=>{
  it("traces each interior face once, with its own street setbacks",()=>{
    const faces=blocks(graph);expect(faces).toHaveLength(1);
    expect(area(faces[0]!.streetBoundary)).toBe(64*65);
    expect(area(faces[0]!.polygon)).toBe(50*47);
    const plots=lots(faces[0]!);expect(plots.length).toBeGreaterThan(10);
    expect(plots.reduce((sum,l)=>sum+area(l.polygon),0)).toBeLessThan(area(faces[0]!.polygon));
    for(const l of plots)expect(Math.hypot(l.front[1]![0]-l.front[0]![0],l.front[1]![1]-l.front[0]![1])).toBeGreaterThanOrEqual(9);
    expect(blocks(graph)).toEqual(faces);
  });
  it("builds carriageways, curb strips, crossings, and opposing right-hand lanes",()=>{
    expect(roadSurfaces(graph).length).toBe(8);expect(sidewalks(graph)).toHaveLength(8);
    expect(crosswalks(graph)).toHaveLength(2);expect(walkNetwork(graph).paths).toHaveLength(8);
    const lanes=laneCenterlines(graph).filter(l=>l.edge==="ab");
    expect(lanes).toHaveLength(4);expect(lanes[0]!.points[0]![1]).toBeCloseTo(2.55);
    expect(lanes[2]!.points[0]![1]).toBeCloseTo(-2.55);
    for(const turn of turnConnectors(graph,"a")){expect(turn.from.edge).not.toBe(turn.to.edge);expect(turn.points.length).toBeGreaterThan(8);}
  });
  it("samples bends and keeps the road grade below 2.5 percent",()=>{
    const edge={...graph.edges[0]!,bend:[[24,-9]] as [number,number][]};
    const line=edgeCenterline(graph,edge);expect(line[0]).toEqual([0,0]);expect(line.at(-1)![0]).toBeCloseTo(64);
    expect(Math.min(...line.map(p=>p[1]))).toBeLessThan(-8.9);
    expect(groundHeight(-4,0)).toBe(1.6);expect(groundHeight(-205,0)).toBe(5);
    expect(plinthHeight([[-100,0],[-80,0]])).toBe(groundHeight(-100,0));
    expect(groundHeight(-101,0)-groundHeight(-100,0)).toBeLessThan(.025);
  });
});

it("keeps a courtyard across an internal dead end and subdivides a curved frontage",()=>{
  const modified:StreetGraph={nodes:[...graph.nodes,{id:"alley",x:15,z:15}],
    edges:[{...graph.edges[0]!,bend:[[32,-5]]},...graph.edges.slice(1),{id:"service",from:"a",to:"alley",cls:"alley"}]};
  const faces=blocks(modified);expect(faces).toHaveLength(1);
  expect(faces[0]!.corners).toHaveLength(4);
  expect(lots(faces[0]!).some(l=>l.front.length>2)).toBe(true);
  const walks=walkNetwork(graph);
  for(const c of walks.crossings)for(const p of c.path)expect(walks.paths.some(s=>s.points.includes(p))).toBe(true);
});

it("keeps the footway outside the road through an oblique junction",async()=>{
  const {footwayClipper}=await import("./pavement.ts");
  const clipped=footwayClipper([{polygon:[[2,-1],[7,-1],[7,6],[2,6]]}]);
  const patches=clipped([[0,0],[5,0],[5,5],[0,5]]);
  expect(patches.reduce((sum,patch)=>sum+Math.abs(area(patch)),0)).toBeCloseTo(10);
  expect(patches.flat().every(([x])=>x<=2)).toBe(true);
});

it("keeps city crossings separate and provides usable road between successive junctions",async()=>{
  const {CITY_PLAN}=await import("./city-plan.data.ts");
  const {footwayClipper}=await import("./pavement.ts");
  const crossings=crosswalks(CITY_PLAN);
  for(const [i,a] of crossings.entries()){
    const other=crossings.slice(i+1);
    const remaining=footwayClipper(other)(a.polygon);
    expect(remaining.reduce((sum,p)=>sum+Math.abs(area(p)),0)).toBeCloseTo(Math.abs(area(a.polygon)));
    for(const b of other.filter(b=>b.edge===a.edge)){
      const gap=Math.min(...a.polygon.flatMap(p=>b.polygon.map(q=>Math.hypot(p[0]-q[0],p[1]-q[1]))));
      expect(gap).toBeGreaterThan(15);
    }
  }
  for(const e of CITY_PLAN.edges.filter(e=>e.cls==="arterial" || e.cls==="boulevard")){
    const line=edgeCenterline(CITY_PLAN,e);
    const length=line.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-line[i]![0],p[1]-line[i]![1]),0);
    expect(length).toBeGreaterThan(30);
  }
});

it("keeps the ridge toe and railway behind the mountain-side sidewalk",async()=>{
  const {CITY_PLAN}=await import("./city-plan.data.ts");
  const {ridgeFootX}=await import("./ridge-foot.ts");
  const {ridgeLength,ridgeProfile}=await import("../ridge-profile.ts");
  const ridge=ridgeProfile([76,null,94,83]);
  const walk=sidewalks(CITY_PLAN).filter(s=>s.edge.startsWith("ridge-") && s.side===1);
  for(let z=-ridgeLength/2;z<65;z+=.5){
    const edges=walk.flatMap(s=>s.polygon.flatMap(([ax,az],i)=>{
      const [bx,bz]=s.polygon[(i+1)%s.polygon.length]!;
      return (az>z)!==(bz>z)?[ax+(bx-ax)*(z-az)/(bz-az)]:[];
    }));
    expect(ridgeFootX(z)).toBeLessThan(Math.min(...edges));
    expect(ridge.track(.5-z/ridgeLength).x+2.2).toBeLessThan(ridgeFootX(z));
  }
});

it("matches each perimeter bend to both straights with continuous tangent and curvature",async()=>{
  const {CITY_PLAN}=await import("./city-plan.data.ts");
  const {transitionBend}=await import("./transition-bend.ts");
  const {bendEdgeMarking}=await import("./street-graph.ts");
  type Point=[number,number];
  const unit=(x:number,z:number):Point=>[x/Math.hypot(x,z),z/Math.hypot(x,z)];
  const close=(p:Point,q:Point)=>expect(Math.hypot(p[0]-q[0],p[1]-q[1])).toBeLessThan(1e-7);
  const elbows=CITY_PLAN.nodes.filter(n=>n.bendSetback);
  expect(elbows.map(n=>n.id).sort()).toEqual(["central-south","ridge-north","ridge-south"]);
  for(const node of elbows){
    const edges=CITY_PLAN.edges.filter(e=>e.from===node.id||e.to===node.id);
    const [a,b]=edges.map(e=>{
      const far=CITY_PLAN.nodes.find(n=>n.id===(e.from===node.id?e.to:e.from))!;
      return unit(far.x-node.x,far.z-node.z);
    }) as [Point,Point];
    const run=node.bendSetback!;
    const start:Point=[node.x+run*a[0],node.z+run*a[1]],end:Point=[node.x+run*b[0],node.z+run*b[1]];
    const curve=transitionBend(start,[-a[0],-a[1]],end,b,.33*run);
    close(unit(...curve.tangent(0)),[-a[0],-a[1]]);
    close(unit(...curve.tangent(1)),b);
    expect(curve.curvature(0)).toBeCloseTo(0,10);
    expect(curve.curvature(1)).toBeCloseTo(0,10);
    const curvature=Array.from({length:33},(_,i)=>Math.abs(curve.curvature(i/64)));
    for(let j=1;j<curvature.length;j++)expect(curvature[j]!).toBeGreaterThan(curvature[j-1]!);
    for(const [i,e] of edges.entries()){
      const line=edgeCenterline(CITY_PLAN,e);
      if(e.from!==node.id)line.reverse();
      for(let j=0;j<=32;j++)close(line[j]!,curve.point(.5+(i?1:-1)*j/64));
    }
    for(const side of [-1,1]){
      const seam=edges.map((edge,i)=>{
        const atStart=edge.from===node.id;
        const line=bendEdgeMarking(CITY_PLAN,edge,side*(atStart?1:-1)*(i?1:-1),0,0);
        return (atStart?line[0]:line.at(-1))!;
      });
      close(seam[0]!,seam[1]!);
    }
  }
});
