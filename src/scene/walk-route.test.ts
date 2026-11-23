import { expect, it } from "vitest";
import { roundedRoute } from "./loop-path.ts";
import { walkingPace } from "./walk-route.ts";

it("keeps full walking pace on straights and shortens the approach to a bend", () => {
  const route = roundedRoute([[0, 0], [0, 8], [8, 8], [8, 0]], 1);
  expect(walkingPace(route, route.nearest(0, 3))).toBeCloseTo(1);
  expect(walkingPace(route, route.nearest(.2, 7.8))).toBeLessThan(.95);
  expect(route.at(route.length)).toEqual(route.at(0));
  expect(route.at(-.2)).toEqual(route.at(route.length - .2));
});
