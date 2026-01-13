import { describe, expect, it } from "@jest/globals";
import { Polyline2 } from "../lib/geom/geomTypes";
import {
  polyline2Centroid,
  polyline2Eval,
  polyline2Reverse,
  polyline2Shift,
  polyline2SignedArea,
  polyline2TotalLength,
  polyline2VertexParams,
} from "../lib/geom/polyline2";
import { DIST_EPSILON } from "../lib/geom/scalar";

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

describe("polyline2Reverse", () => {
  it("handles empty polyline", () => {
    expect(polyline2Reverse([])).toEqual([]);
  });

  it("handles single vertex", () => {
    expect(polyline2Reverse([1, 2])).toEqual([1, 2]);
  });

  it("reverses open polyline", () => {
    expect(polyline2Reverse([0, 0, 1, 1, 2, 2])).toEqual([2, 2, 1, 1, 0, 0]);
  });

  it("reverses closed polyline", () => {
    expect(polyline2Reverse([0, 0, 1, 1, 2, 2, 0, 0])).toEqual([
      0, 0, 2, 2, 1, 1, 0, 0,
    ]);
  });
});

describe("polyline2Centroid", () => {
  it("handles empty polyline", () => {
    expect(polyline2Centroid([])).toEqual([0, 0]);
  });

  it("handles single vertex", () => {
    expect(polyline2Centroid([10, 20])).toEqual([10, 20]);
  });

  it("calculates centroid of a square", () => {
    const square = [0, 0, 10, 0, 10, 10, 0, 10];
    expect(polyline2Centroid(square)).toEqual([5, 5]);
  });

  it("calculates centroid of a triangle", () => {
    const triangle = [0, 0, 6, 0, 3, 6];
    expect(polyline2Centroid(triangle)).toEqual([3, 2]);
  });
});

describe("polyline2SignedArea", () => {
  it("returns 0 for polyline with less than 3 vertices", () => {
    expect(polyline2SignedArea([0, 0, 10, 10])).toBe(0);
  });

  it("calculates positive area for CCW square", () => {
    const ccwSquare = [0, 0, 10, 0, 10, 10, 0, 10];
    expect(polyline2SignedArea(ccwSquare)).toBe(100);
  });

  it("calculates negative area for CW square", () => {
    const cwSquare = [0, 0, 0, 10, 10, 10, 10, 0];
    expect(polyline2SignedArea(cwSquare)).toBe(-100);
  });
});

describe("polyline2TotalLength", () => {
  it("returns 0 for empty or single vertex", () => {
    expect(polyline2TotalLength([])).toBe(0);
    expect(polyline2TotalLength([1, 1])).toBe(0);
  });

  it("calculates length of open line", () => {
    expect(polyline2TotalLength([0, 0, 3, 4])).toBe(5);
    expect(polyline2TotalLength([0, 0, 3, 0, 3, 4])).toBe(7);
  });

  it("calculates length of closed line", () => {
    expect(polyline2TotalLength([0, 0, 3, 0, 3, 4, 0, 0])).toBe(12);
  });
});

describe("polyline2VertexParams", () => {
  it("calculates normalized parameters starting from seam", () => {
    const polyline = [0, 0, 10, 0, 10, 10, 0, 10, 0, 0]; // Closed square, 5 vertices
    const params = polyline2VertexParams(polyline, 0);
    expect(params).toHaveLength(5);
    expect(params[0]).toBe(0);
    expect(params[1]).toBeCloseTo(0.25);
    expect(params[2]).toBeCloseTo(0.5);
    expect(params[3]).toBeCloseTo(0.75);
    expect(params[4]).toBe(1.0);
  });

  it("handles shifted seam", () => {
    const polyline = [0, 0, 10, 0, 10, 10, 0, 10, 0, 0];
    // Shift seam to (10, 0) - index 1
    const params = polyline2VertexParams(polyline, 1);
    expect(params).toHaveLength(5);
    expect(params[0]).toBe(0);
    // Path is (10,0) -> (10,10) -> (0,10) -> (0,0) -> (10,0)
    expect(params[1]).toBeCloseTo(0.25);
    expect(params[2]).toBeCloseTo(0.5);
    expect(params[3]).toBeCloseTo(0.75);
    expect(params[4]).toBe(1.0);
  });

  it("handles zero length polyline", () => {
    expect(polyline2VertexParams([1, 1, 1, 1], 0)).toEqual([0, 0]);
  });
});

describe("polyline2Eval", () => {
  const polyline = [0, 0, 10, 0, 10, 10];

  it("evaluates at start (param 0)", () => {
    expect(polyline2Eval(polyline, 0)).toEqual([0, 0]);
  });

  it("evaluates at end (param 1)", () => {
    expect(polyline2Eval(polyline, 1)).toEqual([10, 10]);
  });

  it("evaluates in middle", () => {
    expect(polyline2Eval(polyline, 0.25)).toEqual([5, 0]);
    expect(polyline2Eval(polyline, 0.5)).toEqual([10, 0]);
    expect(polyline2Eval(polyline, 0.75)).toEqual([10, 5]);
  });

  it("clamps parameter", () => {
    expect(polyline2Eval(polyline, -1)).toEqual([0, 0]);
    expect(polyline2Eval(polyline, 2)).toEqual([10, 10]);
  });

  it("handles zero length polyline", () => {
    expect(polyline2Eval([1, 1, 1, 1], 0.5)).toEqual([1, 1]);
  });

  it("handles single vertex", () => {
    expect(polyline2Eval([1, 1], 0.5)).toEqual([1, 1]);
  });

  it("handles empty polyline", () => {
    expect(polyline2Eval([], 0.5)).toEqual([0, 0]);
  });
});
