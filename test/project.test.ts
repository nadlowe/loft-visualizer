import { describe, expect, it } from "@jest/globals";
import { Plane3, Polyline2, Polyline3 } from "../lib/geom/geomTypes";
import {
  projectPolyline2ToPlane3,
  projectPolyline3ToPlane3,
  projectPolyline3ToWorldXY,
  projectVec2ToPlane3,
} from "../lib/geom/project";

// Helper to compare arrays of numbers with tolerance
function expectArraysToBeCloseTo(
  actual: number[],
  expected: number[],
  precision: number = 10
) {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < actual.length; i++) {
    expect(actual[i]).toBeCloseTo(expected[i], precision);
  }
}

describe("projectPolyline2ToPlane3", () => {
  const polyline: Polyline2 = [0, 0, 10, 0, 10, 10];

  it("projects to XY plane when no plane is provided", () => {
    const { pl2, pl3 } = projectPolyline2ToPlane3(polyline);
    expect(pl2).toEqual([0, 0, 10, 0, 10, 10]);
    expect(pl3).toEqual([0, 0, 0, 10, 0, 0, 10, 10, 0]);
  });

  it("projects to a translated plane", () => {
    const plane: Plane3 = {
      origin: [0, 0, 5],
      normal: [0, 0, 1],
      // Omit u to test default computation
    };
    const { pl3 } = projectPolyline2ToPlane3(polyline, plane);
    expect(pl3).toEqual([0, 0, 5, 10, 0, 5, 10, 10, 5]);
  });

  it("projects to a rotated plane (XZ plane)", () => {
    // Normal is Y-axis, so local Y projects to world Z
    const plane: Plane3 = {
      origin: [0, 0, 0],
      normal: [0, 1, 0],
      u: [1, 0, 0],
    };
    const { pl3 } = projectPolyline2ToPlane3(polyline, plane);
    // Local (10, 10) on XZ plane:
    // u = [1,0,0], v = normal x u = [0,1,0] x [1,0,0] = [0,0,-1]
    // pos = origin + 10*u + 10*v = [10, 0, -10]
    expectArraysToBeCloseTo(pl3, [0, 0, 0, 10, 0, 0, 10, 0, -10]);
  });

  it("skips the closing vertex when requested", () => {
    const closedPolyline: Polyline2 = [0, 0, 10, 0, 10, 10, 0, 0];
    const { pl2, pl3 } = projectPolyline2ToPlane3(
      closedPolyline,
      undefined,
      true
    );
    expect(pl2).toEqual([0, 0, 10, 0, 10, 10]);
    expect(pl3).toEqual([0, 0, 0, 10, 0, 0, 10, 10, 0]);
  });
});

describe("projectPolyline3ToWorldXY", () => {
  it("projects by dropping Z coordinate", () => {
    const pl3: Polyline3 = [1, 2, 3, 4, 5, 6];
    const result = projectPolyline3ToWorldXY(pl3);
    expect(result).toEqual([1, 2, 4, 5]);
  });
});

describe("projectPolyline3ToPlane3", () => {
  it("projects points back to local 2D space (translated)", () => {
    const plane: Plane3 = {
      origin: [100, 0, 0],
      normal: [0, 0, 1],
      u: [1, 0, 0],
    };
    const pl3: Polyline3 = [100, 0, 0, 110, 50, 0];
    const result = projectPolyline3ToPlane3(pl3, plane);
    expectArraysToBeCloseTo(result, [0, 0, 10, 50]);
  });

  it("projects points back to local 2D space (rotated XZ)", () => {
    const plane: Plane3 = {
      origin: [0, 0, 0],
      normal: [0, 1, 0],
      u: [1, 0, 0],
    };
    // world XZ plane: u=[1,0,0], v=[0,0,-1]
    const pl3: Polyline3 = [10, 0, -20];
    const result = projectPolyline3ToPlane3(pl3, plane);
    // world [10, 0, -20] is local x=10, y=20
    expectArraysToBeCloseTo(result, [10, 20]);
  });
});

describe("projectVec2ToPlane3", () => {
  it("projects to XY plane when no plane is provided", () => {
    const result = projectVec2ToPlane3([10, 20]);
    expect(result).toEqual([10, 20, 0]);
  });

  it("projects to a complex plane", () => {
    const plane: Plane3 = {
      origin: [10, 10, 10],
      normal: [0, 0, 1],
      u: [1, 0, 0],
    };
    const result = projectVec2ToPlane3([5, 5], plane);
    expect(result).toEqual([15, 15, 10]);
  });
});
