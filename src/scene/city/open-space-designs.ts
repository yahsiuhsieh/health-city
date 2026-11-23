import type {Point} from "./street-graph.ts";

interface Garden {
  outline:Point[];
  curved:boolean;
  path:Point[];
  trees:Point[];
  benches:[number,number,number][]; // x, z, facing angle in radians
  endBench?:number;
  fountain?:[number,number,number,number]; // x, z, horizontal scales
}

export const gardens:Garden[]=[
  { // An informal grove with a winding walk between two openings.
    outline:[[-8,-4],[-5,-8],[2,-8],[7,-5],[8,1],[5,5],[1,8],[-6,7],[-8,3]],curved:true,
    path:[[-6.1,-2.8],[-5.5,-2],[-2,-2.2],[1,-.1],[1.3,4],[.6,9.6]],
    trees:[[-5,3],[-3.8,5.7],[4.5,-3.8],[5.6,.4],[-4,-5.6],[-.3,-6]],
    endBench:0,benches:[[-6.4,-1.6,2.8],[2.8,3.2,-1.5]]},
  { // A crescent lawn wraps around the bend in the path.
    outline:[[-8,-3],[-4,-7],[3,-8],[7,-5],[5.2,-1.3],[.8,1],[-1,5],[-4,8],[-7.7,5.5]],curved:true,
    path:[[5.7,-1.2],[3,.7],[.8,2.8],[-.8,6.4],[-4.2,9.5]],
    trees:[[-5.3,3.5],[-5,-1.4],[-2.8,-4.9],[1.5,-5.6],[-2.5,-.8],[4,-3.8]],
    endBench:1,benches:[[-1.8,4.9,1.15],[4.2,-1.45,.2]]},
  { // A diagonal shortcut leaves grass and shade on both sides.
    outline:[[-8.5,-5.8],[-3.2,-7.4],[4,-5.8],[7,0],[6,5],[2.2,7.8],[-5.2,6.7],[-8,2.2]],curved:true,
    path:[[-5.9,-5.9],[-4,-4.1],[-1,-1],[2,3.2],[4.8,9.4]],
    trees:[[-5.4,2.3],[3.6,-3.8],[.7,-4.5],[-2.1,4.7],[-5.3,4.8],[4.9,-1.1]],
    endBench:0,benches:[[-6.4,-4.9,2.2],[3.9,3,-.95]]},
];
export const courts:Garden[]=[
  { // Oval fountain terrace with a narrow paved entrance.
    outline:[[-8,0],[-6.7,-4.8],[-1,-6.7],[5.1,-5.7],[8,-1.7],[7.2,3.3],[2,6.7],[-4.1,6]],curved:true,
    path:[[1.4,5.2],[1.2,7],[0,9.8]],trees:[[-5.5,-2.5],[4.8,2.3],[-3.4,4.1],[3.6,-3.7]],
    benches:[[-3.7,.5,1.65],[2,-3.7,-.35]],fountain:[-.3,.2,1.17,.96]},
  { // A tapered court with an elongated basin set to one side.
    outline:[[-8,-3],[-5,-7],[2,-7],[7,-3],[6.8,2.6],[2,7.6],[-2.5,7.6],[-7.6,3.2]],curved:false,
    path:[[0,6.7],[0,9.8]],trees:[[-5.4,-1.7],[3.8,1.6],[.7,5],[-2.6,-4.6]],
    benches:[[-4.2,.8,1.48],[1,-4.8,.08]],fountain:[-.8,-.7,.84,1.48]},
  { // A formal rectangular forecourt at the row of shops.
    outline:[[-8.8,-6.6],[8.8,-6.6],[8.8,6.6],[-8.8,6.6]],curved:false,
    path:[[.5,5.9],[.5,9.8]],trees:[[-6,-4],[6,-4],[6,4],[-6,4]],
    benches:[[-4,1,1.57],[4,1,-1.57]],fountain:[0,0,1,1]},
];
export function openSpaceVariant(form:"park"|"plaza",id:number){
  return form==="park"?id%gardens.length:id===18?2:id%2;
}

// These two coastal entrances face the public path around their block.
export function gardenYaw(id:number,front:number){
  if(id===27)return Math.PI;
  if(id===22 || id===29)return Math.PI/2;
  return front;
}
