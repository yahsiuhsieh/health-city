// All equipment positions are relative to the crane pedestal, in metres.
export const port = {
  craneX: -7.5, craneZ: -22, quayY: .60, quayEdge: -3.425,
  boatX: -1.745, boatZ: -1.2, boatTrim: -.085,
  southEnd: -22.8, northEnd: -6.75,
  receivingAngle: 2.12, sheaveHeight: 8.65, slingHeight: 1.72, trailerDeck: 1.14,
} as const;
export const freighter = { x:.12, z:-35.8, length:32, deckHeight:2.4 } as const;
export const jibReach = freighter.x - port.craneX;
export const receivingBay = {
  x: jibReach * Math.cos(port.receivingAngle),
  z: -jibReach * Math.sin(port.receivingAngle),
};
