import { port } from "./port-layout.ts";
import type { Point } from "./loop-path.ts";

export const harborEdge: Point[] = [
  [-11,-55], [-3.425,-51], [-3.425,-25], [port.quayEdge,port.southEnd],
  [port.quayEdge,port.northEnd], [-12.8,port.northEnd], [-12.8,5.85],
  [-4,10], [-4,46], [-10,51],
];

// Counterclockwise in the ground plane. The apron and boardwalk stay vertical.
const outline: Point[] = [...harborEdge, [-15,53], [-24,55], [-51,70], [-83,73], [-134,72], [-182,74], [-194,71], [-249,82],[-258,74],
  [-261,22], [-262,-20], [-258,-74],[-247,-82], [-195,-73], [-169,-75], [-117,-73], [-68,-74], [-48,-68], [-24,-48], [-16,-47]];

const coastSections = outline.flatMap(([x,z], i) => {
  const [nx,nz] = outline[(i + 1) % outline.length]!;
  const length = Math.hypot(nx-x, nz-z);
  const steps = Math.ceil(length / 3);
  return Array.from({ length: steps }, (_, j) => {
    const u = j / steps;
    const along = i + u;
    const hard = along >= 1 && along <= 8;
    const taper = Math.min(1, Math.max(1-along, along-8, 0));
    const px = x + (nx-x)*u, pz = z + (nz-z)*u;
    const width = taper * (2.6 + .95*Math.sin(px*.12 + pz*.23) + .5*Math.cos(pz*.31-px*.17));
    // Blend adjacent edge normals at corners so neighboring faces share vertices.
    return { x: px, z: pz, width, hard };
  });
});

export const coast = coastSections.map(({x,z,width,hard}, i, points) => {
  const prev = points[(i + points.length - 1) % points.length]!;
  const next = points[(i + 1) % points.length]!;
  const dx = next.x - prev.x, dz = next.z - prev.z;
  const length = Math.hypot(dx,dz);
  const offshore = (distance: number): Point => [x + dz/length*distance, z - dx/length*distance];
  return { crest: [x,z] as Point, beach: offshore(width*.55), waterline: offshore(width),
    toe: offshore(width*1.8), shelf: hard ? 4.2 : 6 + width*2.5, width };
});
