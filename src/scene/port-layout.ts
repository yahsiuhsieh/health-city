import {cargoQuay,freighter,WORK_BOAT_BERTH} from "./city/harbor-plan.ts";
export {freighter};
// All equipment positions are relative to the crane pedestal, in metres.
export const port = {
  craneX: -7.5, craneZ: -34, quayY: cargoQuay.top, quayEdge: cargoQuay.edge,
  boatX: WORK_BOAT_BERTH.position[0], boatZ: WORK_BOAT_BERTH.position[1], boatTrim: -.085,
  southEnd: -22.8, northEnd: -6.75,
  receivingAngle: 2.12, sheaveHeight: 8.65, slingHeight: 1.72, trailerDeck: 1.14,
} as const;

export const jibReach = freighter.x - port.craneX;
export const receivingBay = {
  x: jibReach * Math.cos(port.receivingAngle),
  z: -jibReach * Math.sin(port.receivingAngle),
};
