import {CITY_PLAN} from "./city-plan.data.ts";
import {edgeCenterline,offsetLine,sections} from "./street-graph.ts";

// Ridge Road runs south to north. Its left sidewalk borders the mountain.
const westWalk=CITY_PLAN.edges.filter(e=>e.name==="Ridge Road").flatMap(edge=>
  offsetLine(edgeCenterline(CITY_PLAN,edge),sections[edge.cls].width/2)
).sort((a,b)=>a[1]-b[1]);

export function ridgeFootX(z:number){
  const i=westWalk.findIndex(point=>point[1]>=z);
  if(i<=0)return westWalk[i===0?0:westWalk.length-1]![0]-.8;
  const [ax,az]=westWalk[i-1]!,[bx,bz]=westWalk[i]!;
  return ax+(bx-ax)*(z-az)/(bz-az)-.8;
}
