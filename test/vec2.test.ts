import { describe, expect, it } from "@jest/globals";
import { Vec2 } from "../lib/geom/geomTypes";
import { vec2Distance } from "../lib/geom/vec2";

describe("vec2Distance", () => {
  it("calculates distance between two points", () => {
    const a: Vec2 = [0, 0];
    const b: Vec2 = [3, 4];
    expect(vec2Distance(a, b)).toBe(5);
  });

  it("calculates distance between points with negative coordinates", () => {
    const a: Vec2 = [-1, -1];
    const b: Vec2 = [2, 3];
    expect(vec2Distance(a, b)).toBe(5);
  });

  it("returns zero for same point", () => {
    const a: Vec2 = [10, 20];
    expect(vec2Distance(a, a)).toBe(0);
  });
});
