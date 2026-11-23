export type Point = readonly [x: number, z: number];

// Trim each corner with a quadratic bend and tabulate distance along the closed route.
export function roundedRoute(corners: readonly Point[], radius: number | readonly number[]) {
  const cornersWithBends: Point[] = [];
  for (let i = 0; i < corners.length; i++) {
    const [x, z] = corners[i]!;
    const prev = corners[(i + corners.length - 1) % corners.length]!;
    const next = corners[(i + 1) % corners.length]!;
    const before = Math.hypot(prev[0] - x, prev[1] - z);
    const after = Math.hypot(next[0] - x, next[1] - z);
    const trim = Math.min(typeof radius === "number" ? radius : radius[i]!, before * .45, after * .45);
    const a = [(prev[0] - x) * trim / before, (prev[1] - z) * trim / before];
    const b = [(next[0] - x) * trim / after, (next[1] - z) * trim / after];
    for (let j = 0; j <= 16; j++) {
      const t = j / 16,
        u = 1 - t;
      cornersWithBends.push([x + u * u * a[0]! + t * t * b[0]!, z + u * u * a[1]! + t * t * b[1]!]);
    }
  }
  return polylineRoute(cornersWithBends);
}

export function polylineRoute(vertices: readonly Point[]) {
  const points: Point[] = [];
  const ends: number[] = [];
  let length = 0;
  function append(x: number, z: number) {
    const last = points.at(-1);
    const segment = last ? Math.hypot(x - last[0], z - last[1]) : 0;
    if (last && segment < .00001) return;
    length += segment;
    points.push([x, z]);
    ends.push(length);
  }
  for (const point of vertices) append(...point);
  append(...points[0]!);
  function at(distance: number) {
    const remainder = distance % length;
    const d = remainder < 0 ? remainder + length : remainder;
    let lo = 0,
      hi = ends.length - 1;
    while (hi - lo > 1) {
      const middle = (lo + hi) >> 1;
      if (ends[middle]! > d) {
        hi = middle;
      } else {
        lo = middle;
      }
    }
    const a = points[lo]!,
      b = points[hi]!;
    const t = (d - ends[lo]!) / (ends[hi]! - ends[lo]!);
    return {
      x: a[0] + t * (b[0] - a[0]),
      z: a[1] + t * (b[1] - a[1]),
      yaw: Math.atan2(b[0] - a[0], b[1] - a[1])
    };
  }
  function nearest(x: number, z: number) {
    let best = Infinity,
      distance = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!,
        b = points[i]!,
        dx = b[0] - a[0],
        dz = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
      const error = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
      if (error < best) {
        best = error;
        distance = ends[i - 1]! + t * (ends[i]! - ends[i - 1]!);
      }
    }
    return distance;
  }
  return {
    length,
    at,
    nearest
  };
}
export type StreetRoute = ReturnType<typeof roundedRoute>;
