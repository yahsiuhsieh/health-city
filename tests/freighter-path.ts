import { HARBOR_MOUTH, freighter, turningBasin } from "../src/scene/city/harbor-plan.ts";
import type { Point } from "../src/scene/loop-path.ts";

// Tug-assisted translations preserve the freighter's heading until the turn.
export function freighterTestPath(){
  const steps:{x:number;z:number;yaw:number;leg:string}[]=[];
  const yaw=-Math.PI/2, start:Point=[freighter.x,freighter.z], off:Point=[freighter.x+3,freighter.z];
  function translate(a:Point,b:Point,heading:number,leg:string){
    const count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.45);
    for(let i=0;i<=count;i++)steps.push({x:a[0]+(b[0]-a[0])*i/count,z:a[1]+(b[1]-a[1])*i/count,yaw:heading,leg});
  }
  translate(start,off,yaw,"Cast off");
  translate(off,turningBasin.center,yaw,"Enter basin");
  for(let i=0;i<=90;i++)steps.push({x:turningBasin.center[0],z:turningBasin.center[1],yaw:yaw*(1-i/90),leg:"Turn east"});
  const [mx,mz]=HARBOR_MOUTH.point;
  translate(turningBasin.center,[mx-22,mz+18],0,"Approach entrance");
  translate([mx-22,mz+18],[mx+45,mz+18],0,"Leave harbor");
  return steps;
}
