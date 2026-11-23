import type { StreetRoute } from "./loop-path.ts";

export function angleDifference(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

// Scale the distance covered per replay tick before a bend. Gait uses the resulting metres.
export function walkingPace(route: StreetRoute, distance: number) {
  const turn = angleDifference(route.at(distance).yaw, route.at(distance + .45).yaw);
  return 1 - .27 * Math.min(1, Math.abs(Math.sin(turn)));
}
