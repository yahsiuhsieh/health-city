import { clamp01, type IslandTerrain } from "./island-shape.ts";
import { seededRandom } from "./random.ts";

export function mistBank(land:IslandTerrain) {
  const {center,bounds,distance}=land.reef;
  const halfX=Math.max(60,center[0]-bounds.left,bounds.right-center[0])+65;
  const halfZ=Math.max(40,center[1]-bounds.bottom,bounds.top-center[1])+65;
  const random=seededRandom(String(land.seed),"mist");
  const patches=Array.from({length:12},(_,i)=>({
    x:center[0]+((i%4+.25+.5*random())/4-.5)*(halfX*2-80),
    z:center[1]+((Math.floor(i/4)+.25+.5*random())/3-.5)*(halfZ*2-80),
    radius:25+15*random()
  }));
  function density(x:number,z:number) {
    const u=clamp01((distance(x,z)-30)/32);
    return 1-u*u*(3-2*u);
  }
  return {center,halfX,halfZ,patches,density};
}
