import {expect,it} from "vitest";
import {Vector3} from "three";
import {startFlight,type CameraPose} from "./focus-flight.ts";

const from:CameraPose={target:new Vector3(),azimuth:3.1,polar:1,radius:400,zoom:3,width:40,offsetX:0,offsetY:0};
const to:CameraPose={target:new Vector3(200,4,0),azimuth:-3.1,polar:.7,radius:355,zoom:5,width:80,offsetX:-120,offsetY:0};
it("settles at the live pose for both motion preferences",()=>{
  for(const reduced of [false,true]){
    const flight=startFlight(from,to,reduced);
    const live={...to,target:new Vector3(205,4,1)};
    expect(flight.sample(flight.duration,live)).toEqual(live);
    const middle=flight.sample(flight.duration/2)!;
    expect(Math.abs(middle.azimuth-from.azimuth)).toBeLessThan(.6);
    expect(middle.zoom).toBeCloseTo(reduced?Math.sqrt(15):2.1);
  }
});
it("stops sampling poses when the user interrupts the flight",()=>{
  const flight=startFlight(from,to,false);
  expect(flight.sample(.1)).not.toBeNull();
  flight.cancel();expect(flight.sample(.2)).toBeNull();
});
