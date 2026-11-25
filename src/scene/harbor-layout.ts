import { WORK_BOAT_BERTH } from "./city/harbor-plan.ts";
// Ground coordinates are metres. Y is up and positive X faces the sea.
export const PAVING_Y = .60;
export const WORK_FLOAT = { x: 5.8, z: -4.5, halfWidth: .875, halfLength: 8.6, deck: .46 };
export const DOCK = { x: -4.3, z: -1.2, halfWidth: .875, halfLength: 5.55, deck: .46 };

// Attachment points in boat-local metres and quay coordinates.
export const workingLines = [
  { fairlead: [-8,1.6,-1.85], bollardX: WORK_BOAT_BERTH.position[0]-10 },
  { fairlead: [8,1.6,-1.25], bollardX: WORK_BOAT_BERTH.position[0]+10 },
] as const;
