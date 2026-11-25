import { DOCK } from "../harbor-layout.ts";
import { port } from "../port-layout.ts";
import { civicPlaza } from "./city-plan.data.ts";
import { crossingAt } from "./routes.ts";
import { surfaceHeight } from "./terrain.ts";

const market = crossingAt("market-end","central-market/market-end").path;
const x = market[0]![0], z = (market[0]![1]+market[1]![1])/2;
const plaza = civicPlaza.reduce(([x,z],[px,pz]) => [x+px/civicPlaza.length,z+pz/civicPlaza.length],[0,0]);
function street(x:number,z:number):[number,number,number] {return [x,surfaceHeight(x,z)+1,z];}
export const cameraSpots = {
  harbor: [-5,2,-40], berth: [port.boatX,2,port.boatZ],
  detail: [DOCK.x,1.6,DOCK.z], walk:street(x,z), road:street(x-17,z),
  square:street(plaza[0]!,plaza[1]!), side:street(-157,-78),
} satisfies Record<string,[number,number,number]>;
