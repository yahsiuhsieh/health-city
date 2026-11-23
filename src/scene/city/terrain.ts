// Heights are metres above the harbor datum. The slope is 1.7 percent.
export function groundHeight(x: number, _z: number) {
  return 1.6 + 3.4 * Math.min(1, Math.max(0, (-4 - x) / 201));
}

export function plinthHeight(corners: readonly (readonly [number, number])[]) {
  return Math.max(...corners.map(([x, z]) => groundHeight(x, z)));
}

// The retained working apron stays at its crane and boat boarding elevation.
export function surfaceHeight(x:number,z:number){
  const grade=groundHeight(x,z);
  const apron=Math.min(1,Math.max(0,(x+18)/4));
  return grade+(0.57-grade)*apron;
}
