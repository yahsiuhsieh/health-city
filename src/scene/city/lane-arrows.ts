import type {Point,StreetEdge} from "./street-graph.ts";
import {sections} from "./street-graph.ts";

type Movement="through"|"left"|"right"|"through-left"|"through-right";
type Approach={edge:string;at:string;lanes:[Movement,Movement]};
// List lanes from the median to the curb in the driver's direction.
const approaches:Approach[]=[
  {edge:"central-market/market-end",at:"market-end",lanes:["left","right"]},
  {edge:"central-market/market-end",at:"central-market",lanes:["through-left","through-right"]},
  {edge:"central-harbor/gate",at:"central-harbor",lanes:["through","through-right"]},
  {edge:"central-south/central-harbor",at:"central-harbor",lanes:["through-left","through"]},
  {edge:"ridge-harbor/ridge-market",at:"ridge-market",lanes:["left","through"]},
  {edge:"ridge-harbor/ridge-market",at:"ridge-harbor",lanes:["through","through-right"]},
  {edge:"gate/market-end",at:"market-end",lanes:["through","through-right"]},
];
const straight:Point[]=[[0,-.20],[2.8,-.20],[2.65,-.75],[4.5,0],[2.65,.75],[2.8,.20],[0,.20]];
const turn:Point[]=[[0,-.19],[1.75,-.19],[2.26,-.09],[2.62,.24],[2.89,.61],[3.30,.36],[3.22,1.40],[2.18,1.19],[2.55,.89],[2.29,.50],[2.01,.28],[1.71,.19],[0,.19]];

export function laneArrows(edge:StreetEdge,start:number,end:number,sample:(d:number,side:number)=>Point){
  const paint:Point[][]=[],section=sections[edge.cls];
  const selected=approaches.filter(a=>a.edge===edge.id);
  if(end-start<(selected.length===2?24:13))return paint;
  for(const approach of selected){
    const direction=approach.at===edge.to?1:-1;
    const station=direction===1?end-10:start+10;
    for(const [i,movement] of approach.lanes.entries()){
      const lane=section.median/2+section.lane*(i+.5);
      const place=(shape:Point[],mirror=1)=>paint.push(shape.map(([forward,right])=>
        sample(station+direction*forward,direction*(lane+right*mirror))));
      if(movement.startsWith("through"))place(straight);
      if(movement.endsWith("left"))place(turn,-1);
      if(movement.endsWith("right"))place(turn);
    }
  }
  return paint;
}
