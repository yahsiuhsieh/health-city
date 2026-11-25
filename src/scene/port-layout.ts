import {marketQuay,WORK_BOAT_BERTH} from "./city/harbor-plan.ts";

export const port = {
  quayY: marketQuay.top, quayEdge: marketQuay.edge,
  boatX: WORK_BOAT_BERTH.position[0], boatZ: WORK_BOAT_BERTH.position[1], boatTrim: -.085,
  southEnd: -22.8, northEnd: -6.75,
};
