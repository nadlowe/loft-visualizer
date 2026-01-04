import { describe, expect, it } from "@jest/globals";
import { Polyline2 } from "../lib/geom/geomTypes";
import { mat3Identity, mat3Rotate, mat3Translate } from "../lib/geom/mat3";
import {
  polyline2Rotate,
  polyline2Shift,
  polyline2Transform,
  polyline2Translate,
} from "../lib/geom/polyline2";
import { DIST_EPSILON } from "../lib/geom/scalar";

describe("polyline2Transform", () => {
  it("transforms polyline with identity matrix", () => {
    const polyline: Polyline2 = [1, 2, 3, 4, 5, 6];
    const mat = mat3Identity();
    const result = polyline2Transform(polyline, mat);
    expect(result).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("transforms polyline with translation matrix", () => {
    const polyline: Polyline2 = [1, 2, 3, 4];
    const mat = mat3Translate(5, 10);
    const result = polyline2Transform(polyline, mat);
    expect(result).toEqual([6, 12, 8, 14]);
  });

  it("transforms polyline with rotation matrix (90 degrees)", () => {
    const polyline: Polyline2 = [1, 0, 2, 0];
    const mat = mat3Rotate(Math.PI / 2);
    const result = polyline2Transform(polyline, mat);
    expect(result[0]).toBeCloseTo(0, 10);
    expect(result[1]).toBeCloseTo(1, 10);
    expect(result[2]).toBeCloseTo(0, 10);
    expect(result[3]).toBeCloseTo(2, 10);
  });

  it("transforms polyline with rotation matrix (180 degrees)", () => {
    const polyline: Polyline2 = [1, 0, 2, 0];
    const mat = mat3Rotate(Math.PI);
    const result = polyline2Transform(polyline, mat);
    expect(result[0]).toBeCloseTo(-1, 10);
    expect(result[1]).toBeCloseTo(0, 10);
    expect(result[2]).toBeCloseTo(-2, 10);
    expect(result[3]).toBeCloseTo(0, 10);
  });

  it("transforms empty polyline", () => {
    const polyline: Polyline2 = [];
    const mat = mat3Translate(5, 10);
    const result = polyline2Transform(polyline, mat);
    expect(result).toEqual([]);
  });

  it("transforms single vertex polyline", () => {
    const polyline: Polyline2 = [1, 2];
    const mat = mat3Translate(5, 10);
    const result = polyline2Transform(polyline, mat);
    expect(result).toEqual([6, 12]);
  });

  it("transforms polyline with multiple vertices", () => {
    const polyline: Polyline2 = [0, 0, 1, 0, 1, 1, 0, 1];
    const mat = mat3Translate(10, 20);
    const result = polyline2Transform(polyline, mat);
    expect(result).toEqual([10, 20, 11, 20, 11, 21, 10, 21]);
  });

  it("transforms polyline with rotation matrix (45 degrees)", () => {
    const polyline: Polyline2 = [1, 0];
    const mat = mat3Rotate(Math.PI / 4);
    const result = polyline2Transform(polyline, mat);
    const expectedX = Math.cos(Math.PI / 4);
    const expectedY = Math.sin(Math.PI / 4);
    expect(result[0]).toBeCloseTo(expectedX, 10);
    expect(result[1]).toBeCloseTo(expectedY, 10);
  });
});

describe("polyline2Translate", () => {
  it("translates polyline by positive amounts", () => {
    const polyline: Polyline2 = [1, 2, 3, 4];
    const result = polyline2Translate(polyline, 5, 10);
    expect(result).toEqual([6, 12, 8, 14]);
  });

  it("translates polyline by negative amounts", () => {
    const polyline: Polyline2 = [5, 6, 7, 8];
    const result = polyline2Translate(polyline, -2, -3);
    expect(result).toEqual([3, 3, 5, 5]);
  });

  it("translates polyline by zero", () => {
    const polyline: Polyline2 = [1, 2, 3, 4];
    const result = polyline2Translate(polyline, 0, 0);
    expect(result).toEqual([1, 2, 3, 4]);
  });

  it("translates empty polyline", () => {
    const polyline: Polyline2 = [];
    const result = polyline2Translate(polyline, 5, 10);
    expect(result).toEqual([]);
  });

  it("translates single vertex polyline", () => {
    const polyline: Polyline2 = [1, 2];
    const result = polyline2Translate(polyline, 10, 20);
    expect(result).toEqual([11, 22]);
  });

  it("translates polyline with multiple vertices", () => {
    const polyline: Polyline2 = [0, 0, 1, 0, 1, 1, 0, 1];
    const result = polyline2Translate(polyline, 10, 20);
    expect(result).toEqual([10, 20, 11, 20, 11, 21, 10, 21]);
  });

  it("translates polyline with mixed positive and negative", () => {
    const polyline: Polyline2 = [5, -3, 10, -5];
    const result = polyline2Translate(polyline, -2, 7);
    expect(result).toEqual([3, 4, 8, 2]);
  });

  it("translates polyline at origin", () => {
    const polyline: Polyline2 = [0, 0, 1, 0, 0, 1];
    const result = polyline2Translate(polyline, 5, 10);
    expect(result).toEqual([5, 10, 6, 10, 5, 11]);
  });
});

describe("polyline2Rotate", () => {
  it("rotates polyline around origin (90 degrees)", () => {
    const polyline: Polyline2 = [1, 0, 2, 0];
    const result = polyline2Rotate(polyline, Math.PI / 2);
    expect(result[0]).toBeCloseTo(0, 10);
    expect(result[1]).toBeCloseTo(1, 10);
    expect(result[2]).toBeCloseTo(0, 10);
    expect(result[3]).toBeCloseTo(2, 10);
  });

  it("rotates polyline around origin (180 degrees)", () => {
    const polyline: Polyline2 = [1, 0, 2, 0];
    const result = polyline2Rotate(polyline, Math.PI);
    expect(result[0]).toBeCloseTo(-1, 10);
    expect(result[1]).toBeCloseTo(0, 10);
    expect(result[2]).toBeCloseTo(-2, 10);
    expect(result[3]).toBeCloseTo(0, 10);
  });

  it("rotates polyline around origin (360 degrees)", () => {
    const polyline: Polyline2 = [1, 2, 3, 4];
    const result = polyline2Rotate(polyline, 2 * Math.PI);
    expect(result[0]).toBeCloseTo(1, 10);
    expect(result[1]).toBeCloseTo(2, 10);
    expect(result[2]).toBeCloseTo(3, 10);
    expect(result[3]).toBeCloseTo(4, 10);
  });

  it("rotates polyline around origin (45 degrees)", () => {
    const polyline: Polyline2 = [1, 0];
    const result = polyline2Rotate(polyline, Math.PI / 4);
    const expectedX = Math.cos(Math.PI / 4);
    const expectedY = Math.sin(Math.PI / 4);
    expect(result[0]).toBeCloseTo(expectedX, 10);
    expect(result[1]).toBeCloseTo(expectedY, 10);
  });

  it("rotates polyline around custom origin", () => {
    const polyline: Polyline2 = [2, 0, 3, 0];
    const result = polyline2Rotate(polyline, Math.PI / 2, 1, 0);
    // Rotating [2,0] and [3,0] around [1,0] by 90 degrees should give [1,1] and [1,2]
    expect(result[0]).toBeCloseTo(1, 10);
    expect(result[1]).toBeCloseTo(1, 10);
    expect(result[2]).toBeCloseTo(1, 10);
    expect(result[3]).toBeCloseTo(2, 10);
  });

  it("rotates polyline around custom origin (180 degrees)", () => {
    const polyline: Polyline2 = [3, 0, 4, 0];
    const result = polyline2Rotate(polyline, Math.PI, 1, 0);
    // Rotating [3,0] and [4,0] around [1,0] by 180 degrees should give [-1,0] and [-2,0]
    expect(result[0]).toBeCloseTo(-1, 10);
    expect(result[1]).toBeCloseTo(0, 10);
    expect(result[2]).toBeCloseTo(-2, 10);
    expect(result[3]).toBeCloseTo(0, 10);
  });

  it("rotates polyline around origin at (0,0)", () => {
    const polyline: Polyline2 = [1, 1, 2, 1];
    const result = polyline2Rotate(polyline, Math.PI / 2, 0, 0);
    expect(result[0]).toBeCloseTo(-1, 10);
    expect(result[1]).toBeCloseTo(1, 10);
    expect(result[2]).toBeCloseTo(-1, 10);
    expect(result[3]).toBeCloseTo(2, 10);
  });

  it("rotates polyline around custom origin (2,2)", () => {
    const polyline: Polyline2 = [3, 2, 4, 2];
    const result = polyline2Rotate(polyline, Math.PI / 2, 2, 2);
    // Rotating [3,2] and [4,2] around [2,2] by 90 degrees should give [2,3] and [2,4]
    expect(result[0]).toBeCloseTo(2, 10);
    expect(result[1]).toBeCloseTo(3, 10);
    expect(result[2]).toBeCloseTo(2, 10);
    expect(result[3]).toBeCloseTo(4, 10);
  });

  it("rotates polyline by zero radians", () => {
    const polyline: Polyline2 = [1, 2, 3, 4];
    const result = polyline2Rotate(polyline, 0);
    expect(result).toEqual([1, 2, 3, 4]);
  });

  it("rotates empty polyline", () => {
    const polyline: Polyline2 = [];
    const result = polyline2Rotate(polyline, Math.PI / 2);
    expect(result).toEqual([]);
  });

  it("rotates single vertex polyline", () => {
    const polyline: Polyline2 = [1, 0];
    const result = polyline2Rotate(polyline, Math.PI / 2);
    expect(result[0]).toBeCloseTo(0, 10);
    expect(result[1]).toBeCloseTo(1, 10);
  });

  it("rotates polyline forming a square", () => {
    const polyline: Polyline2 = [0, 0, 1, 0, 1, 1, 0, 1];
    const result = polyline2Rotate(polyline, Math.PI / 2);
    // Rotating square by 90 degrees: [0,0] -> [0,0], [1,0] -> [0,1], [1,1] -> [-1,1], [0,1] -> [-1,0]
    expect(result[0]).toBeCloseTo(0, 10);
    expect(result[1]).toBeCloseTo(0, 10);
    expect(result[2]).toBeCloseTo(0, 10);
    expect(result[3]).toBeCloseTo(1, 10);
    expect(result[4]).toBeCloseTo(-1, 10);
    expect(result[5]).toBeCloseTo(1, 10);
    expect(result[6]).toBeCloseTo(-1, 10);
    expect(result[7]).toBeCloseTo(0, 10);
  });
});

describe("polyline2Shift", () => {
  type TestCase = {
    name: string;
    input: Polyline2;
    shift: number;
    expected: Polyline2;
  };

  const testCases: TestCase[] = [
    // Closed polyline - positive shifts
    {
      name: "closed polyline shift 0",
      input: [1, 1, 2, 2, 3, 3, 1, 1],
      shift: 0,
      expected: [1, 1, 2, 2, 3, 3, 1, 1],
    },
    {
      name: "closed polyline shift 1",
      input: [1, 1, 2, 2, 3, 3, 1, 1],
      shift: 1,
      expected: [2, 2, 3, 3, 1, 1, 2, 2],
    },
    {
      name: "closed polyline shift 2",
      input: [1, 1, 2, 2, 3, 3, 1, 1],
      shift: 2,
      expected: [3, 3, 1, 1, 2, 2, 3, 3],
    },
    {
      name: "closed polyline shift 3 (wraps to 0)",
      input: [1, 1, 2, 2, 3, 3, 1, 1],
      shift: 3,
      expected: [1, 1, 2, 2, 3, 3, 1, 1],
    },
    {
      name: "closed polyline shift 4 (wraps to 1)",
      input: [1, 1, 2, 2, 3, 3, 1, 1],
      shift: 4,
      expected: [2, 2, 3, 3, 1, 1, 2, 2],
    },

    // Closed polyline - negative shifts
    {
      name: "closed polyline shift -1",
      input: [1, 1, 2, 2, 3, 3, 1, 1],
      shift: -1,
      expected: [3, 3, 1, 1, 2, 2, 3, 3],
    },
    {
      name: "closed polyline shift -2",
      input: [1, 1, 2, 2, 3, 3, 1, 1],
      shift: -2,
      expected: [2, 2, 3, 3, 1, 1, 2, 2],
    },
    {
      name: "closed polyline shift -3 (wraps to 0)",
      input: [1, 1, 2, 2, 3, 3, 1, 1],
      shift: -3,
      expected: [1, 1, 2, 2, 3, 3, 1, 1],
    },
    {
      name: "closed polyline shift -4 (wraps to -1)",
      input: [1, 1, 2, 2, 3, 3, 1, 1],
      shift: -4,
      expected: [3, 3, 1, 1, 2, 2, 3, 3],
    },

    // Open polyline - positive shifts
    {
      name: "open polyline shift 0",
      input: [1, 1, 2, 2, 3, 3],
      shift: 0,
      expected: [1, 1, 2, 2, 3, 3],
    },
    {
      name: "open polyline shift 1",
      input: [1, 1, 2, 2, 3, 3],
      shift: 1,
      expected: [2, 2, 3, 3, 1, 1],
    },
    {
      name: "open polyline shift 2",
      input: [1, 1, 2, 2, 3, 3],
      shift: 2,
      expected: [3, 3, 1, 1, 2, 2],
    },
    {
      name: "open polyline shift 3 (wraps to 0)",
      input: [1, 1, 2, 2, 3, 3],
      shift: 3,
      expected: [1, 1, 2, 2, 3, 3],
    },
    {
      name: "open polyline shift 4 (wraps to 1)",
      input: [1, 1, 2, 2, 3, 3],
      shift: 4,
      expected: [2, 2, 3, 3, 1, 1],
    },

    // Open polyline - negative shifts
    {
      name: "open polyline shift -1",
      input: [1, 1, 2, 2, 3, 3],
      shift: -1,
      expected: [3, 3, 1, 1, 2, 2],
    },
    {
      name: "open polyline shift -2",
      input: [1, 1, 2, 2, 3, 3],
      shift: -2,
      expected: [2, 2, 3, 3, 1, 1],
    },
    {
      name: "open polyline shift -3 (wraps around)",
      input: [1, 1, 2, 2, 3, 3],
      shift: -3,
      expected: [1, 1, 2, 2, 3, 3],
    },
    {
      name: "open polyline shift -4 (wraps to -1)",
      input: [1, 1, 2, 2, 3, 3],
      shift: -4,
      expected: [3, 3, 1, 1, 2, 2],
    },

    // Test distance epsilon
    {
      name: "almost closed polyline (within epsilon) treated as closed",
      input: [1, 1, 2, 2, 3, 3, 1 + DIST_EPSILON / 2, 1 + DIST_EPSILON / 2],
      shift: 1,
      expected: [2, 2, 3, 3, 1, 1, 2, 2],
    },
    {
      name: "almost closed polyline (just outside epsilon) treated as open",
      input: [1, 1, 2, 2, 3, 3, 1 + DIST_EPSILON * 2, 1 + DIST_EPSILON * 2],
      shift: 1,
      expected: [2, 2, 3, 3, 1 + DIST_EPSILON * 2, 1 + DIST_EPSILON * 2, 1, 1],
    },
    {
      name: "almost closed polyline X within epsilon, Y within epsilon",
      input: [1, 1, 2, 2, 3, 3, 1 + DIST_EPSILON / 2, 1 - DIST_EPSILON / 2],
      shift: 1,
      expected: [2, 2, 3, 3, 1, 1, 2, 2],
    },
    {
      name: "almost closed polyline X outside epsilon, Y within epsilon",
      input: [1, 1, 2, 2, 3, 3, 1 + DIST_EPSILON * 2, 1],
      shift: 1,
      expected: [2, 2, 3, 3, 1 + DIST_EPSILON * 2, 1, 1, 1],
    },

    // Edge cases
    {
      name: "empty polyline",
      input: [],
      shift: 1,
      expected: [],
    },
    {
      name: "single vertex polyline",
      input: [1, 1],
      shift: 1,
      expected: [1, 1],
    },
    {
      name: "closed polyline with 2 vertices",
      input: [1, 1, 2, 2, 1, 1],
      shift: 1,
      expected: [2, 2, 1, 1, 2, 2],
    },
    {
      name: "open polyline with 2 vertices shift 1",
      input: [1, 1, 2, 2],
      shift: 1,
      expected: [2, 2, 1, 1],
    },
    {
      name: "open polyline with 2 vertices shift -1",
      input: [1, 1, 2, 2],
      shift: -1,
      expected: [2, 2, 1, 1],
    },
  ];

  testCases.forEach(({ name, input, shift, expected }) => {
    it(name, () => {
      const result = polyline2Shift(input, shift);
      expect(result).toEqual(expected);
    });
  });
});
