import { describe, expect, it } from "@jest/globals";
import { Polyline2 } from "../lib/geom/geomTypes";
import {
  polyline2MergeOverlappingVertices,
  polyline2Shift,
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

describe("polyline2MergeOverlappingVertices", () => {
  it("returns copy of polyline with less than 3 vertices", () => {
    expect(polyline2MergeOverlappingVertices([])).toEqual([]);
    expect(polyline2MergeOverlappingVertices([1, 2])).toEqual([1, 2]);
    expect(polyline2MergeOverlappingVertices([1, 2, 3, 4])).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it("preserves polyline with no overlapping vertices", () => {
    const polyline: Polyline2 = [0, 0, 1, 0, 2, 0, 3, 0];
    const result = polyline2MergeOverlappingVertices(polyline);
    expect(result).toEqual([0, 0, 1, 0, 2, 0, 3, 0]);
  });

  it("merges overlapping interior vertices", () => {
    // Vertex at index 1 and 2 are at the same location
    const polyline: Polyline2 = [0, 0, 1, 1, 1, 1, 2, 2];
    const result = polyline2MergeOverlappingVertices(polyline);
    expect(result).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it("merges multiple consecutive overlapping vertices", () => {
    // Vertices 1, 2, 3 are all at the same location
    const polyline: Polyline2 = [0, 0, 1, 1, 1, 1, 1, 1, 2, 2];
    const result = polyline2MergeOverlappingVertices(polyline);
    expect(result).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it("preserves start vertex even if interior vertex overlaps", () => {
    // Interior vertex at index 1 overlaps with start
    const polyline: Polyline2 = [0, 0, 0, 0, 1, 1, 2, 2];
    const result = polyline2MergeOverlappingVertices(polyline);
    expect(result).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it("preserves end vertex even if interior vertex overlaps", () => {
    // Interior vertex at index 2 overlaps with end (index 3)
    const polyline: Polyline2 = [0, 0, 1, 1, 2, 2, 2, 2];
    const result = polyline2MergeOverlappingVertices(polyline);
    expect(result).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it("preserves both start and end even if they overlap", () => {
    // Start and end are at the same location (closed polyline)
    const polyline: Polyline2 = [0, 0, 1, 1, 2, 2, 0, 0];
    const result = polyline2MergeOverlappingVertices(polyline);
    expect(result).toEqual([0, 0, 1, 1, 2, 2, 0, 0]);
  });

  it("merges vertices within epsilon tolerance", () => {
    const tiny = DIST_EPSILON / 2;
    const polyline: Polyline2 = [0, 0, 1, 1, 1 + tiny, 1 + tiny, 2, 2];
    const result = polyline2MergeOverlappingVertices(polyline);
    expect(result).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it("does not merge vertices outside epsilon tolerance", () => {
    const big = DIST_EPSILON * 2;
    const polyline: Polyline2 = [0, 0, 1, 1, 1 + big, 1 + big, 2, 2];
    const result = polyline2MergeOverlappingVertices(polyline);
    expect(result).toEqual([0, 0, 1, 1, 1 + big, 1 + big, 2, 2]);
  });

  it("handles complex case with multiple merge groups", () => {
    // Two separate groups of overlapping vertices
    const polyline: Polyline2 = [0, 0, 1, 1, 1, 1, 2, 2, 3, 3, 3, 3, 4, 4];
    const result = polyline2MergeOverlappingVertices(polyline);
    expect(result).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("keeps end vertex separate even when interior overlaps with end", () => {
    // Interior vertex at index 3 overlaps with end vertex at index 4
    const polyline: Polyline2 = [0, 0, 1, 1, 2, 2, 3, 3, 3, 3];
    const result = polyline2MergeOverlappingVertices(polyline);
    // Interior vertex 3 should be removed, but end should still be there
    expect(result).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it("allows custom epsilon", () => {
    const polyline: Polyline2 = [0, 0, 1, 1, 1.5, 1.5, 3, 3];
    // With default epsilon, no merge
    expect(polyline2MergeOverlappingVertices(polyline)).toEqual([
      0, 0, 1, 1, 1.5, 1.5, 3, 3,
    ]);
    // With large epsilon, merge happens
    expect(polyline2MergeOverlappingVertices(polyline, 1.0)).toEqual([
      0, 0, 1, 1, 3, 3,
    ]);
  });
});
