import { describe, expect, it } from "@jest/globals";
import { Vec3 } from "../lib/geom/geomTypes";
import {
  computeDefaultU,
  vec3Cross,
  vec3Dot,
  vec3Length,
  vec3Lerp,
  vec3Normalize,
  vec3Scale,
  vec3Subtract,
} from "../lib/geom/vec3";

describe("computeDefaultU", () => {
  it("computes u vector orthogonal to normal pointing in X direction", () => {
    const normal: Vec3 = [0, 0, 1]; // Z-axis (up)
    const u = computeDefaultU(normal);

    // Should be orthogonal to normal
    const dot = vec3Dot(u, normal);
    expect(dot).toBeCloseTo(0, 10);

    // Should be normalized
    const length = vec3Length(u);
    expect(length).toBeCloseTo(1, 10);

    // Should point in X direction (or close to it)
    expect(u[0]).toBeGreaterThan(0.9);
  });

  it("computes u vector for normal pointing in Y direction", () => {
    const normal: Vec3 = [0, 1, 0]; // Y-axis
    const u = computeDefaultU(normal);

    // Should be orthogonal to normal
    const dot = vec3Dot(u, normal);
    expect(dot).toBeCloseTo(0, 10);

    // Should be normalized
    const length = vec3Length(u);
    expect(length).toBeCloseTo(1, 10);
  });

  it("computes u vector for normal pointing in X direction (uses Y fallback)", () => {
    const normal: Vec3 = [1, 0, 0]; // X-axis (parallel to reference)
    const u = computeDefaultU(normal);

    // Should be orthogonal to normal
    const dot = vec3Dot(u, normal);
    expect(dot).toBeCloseTo(0, 10);

    // Should be normalized
    const length = vec3Length(u);
    expect(length).toBeCloseTo(1, 10);
  });

  it("computes u vector for diagonal normal", () => {
    const normal: Vec3 = [1, 1, 1];
    const normalizedNormal = vec3Normalize(normal);
    const u = computeDefaultU(normalizedNormal);

    // Should be orthogonal to normal
    const dot = vec3Dot(u, normalizedNormal);
    expect(dot).toBeCloseTo(0, 10);

    // Should be normalized
    const length = vec3Length(u);
    expect(length).toBeCloseTo(1, 10);
  });
});

describe("vec3Dot", () => {
  it("computes dot product of unit vectors", () => {
    const a: Vec3 = [1, 0, 0];
    const b: Vec3 = [0, 1, 0];
    const result = vec3Dot(a, b);
    expect(result).toBe(0);
  });

  it("computes dot product of parallel vectors", () => {
    const a: Vec3 = [1, 2, 3];
    const b: Vec3 = [2, 4, 6];
    const result = vec3Dot(a, b);
    expect(result).toBe(28); // 1*2 + 2*4 + 3*6 = 2 + 8 + 18 = 28
  });

  it("computes dot product of opposite vectors", () => {
    const a: Vec3 = [1, 2, 3];
    const b: Vec3 = [-1, -2, -3];
    const result = vec3Dot(a, b);
    expect(result).toBe(-14); // -(1^2 + 2^2 + 3^2) = -14
  });

  it("computes dot product with zero vector", () => {
    const a: Vec3 = [1, 2, 3];
    const b: Vec3 = [0, 0, 0];
    const result = vec3Dot(a, b);
    expect(result).toBe(0);
  });

  it("computes dot product of same vector (squared length)", () => {
    const a: Vec3 = [3, 4, 0];
    const result = vec3Dot(a, a);
    expect(result).toBe(25); // 3^2 + 4^2 + 0^2 = 9 + 16 = 25
  });
});

describe("vec3Cross", () => {
  it("computes cross product of X and Y axes (should give Z)", () => {
    const a: Vec3 = [1, 0, 0];
    const b: Vec3 = [0, 1, 0];
    const result = vec3Cross(a, b);
    expect(result).toEqual([0, 0, 1]);
  });

  it("computes cross product of Y and X axes (should give -Z)", () => {
    const a: Vec3 = [0, 1, 0];
    const b: Vec3 = [1, 0, 0];
    const result = vec3Cross(a, b);
    expect(result).toEqual([0, 0, -1]);
  });

  it("computes cross product of parallel vectors (should be zero)", () => {
    const a: Vec3 = [1, 2, 3];
    const b: Vec3 = [2, 4, 6];
    const result = vec3Cross(a, b);
    expect(result[0]).toBeCloseTo(0, 10);
    expect(result[1]).toBeCloseTo(0, 10);
    expect(result[2]).toBeCloseTo(0, 10);
  });

  it("computes cross product of arbitrary vectors", () => {
    const a: Vec3 = [1, 2, 3];
    const b: Vec3 = [4, 5, 6];
    const result = vec3Cross(a, b);
    // a × b = [2*6 - 3*5, 3*4 - 1*6, 1*5 - 2*4]
    //        = [12 - 15, 12 - 6, 5 - 8]
    //        = [-3, 6, -3]
    expect(result[0]).toBe(-3);
    expect(result[1]).toBe(6);
    expect(result[2]).toBe(-3);
  });

  it("cross product is anti-commutative", () => {
    const a: Vec3 = [1, 2, 3];
    const b: Vec3 = [4, 5, 6];
    const ab = vec3Cross(a, b);
    const ba = vec3Cross(b, a);
    expect(ab[0]).toBeCloseTo(-ba[0], 10);
    expect(ab[1]).toBeCloseTo(-ba[1], 10);
    expect(ab[2]).toBeCloseTo(-ba[2], 10);
  });
});

describe("vec3Length", () => {
  it("computes length of unit vector", () => {
    const vec: Vec3 = [1, 0, 0];
    const result = vec3Length(vec);
    expect(result).toBe(1);
  });

  it("computes length of zero vector", () => {
    const vec: Vec3 = [0, 0, 0];
    const result = vec3Length(vec);
    expect(result).toBe(0);
  });

  it("computes length of 3-4-5 triangle", () => {
    const vec: Vec3 = [3, 4, 0];
    const result = vec3Length(vec);
    expect(result).toBe(5);
  });

  it("computes length of arbitrary vector", () => {
    const vec: Vec3 = [1, 2, 3];
    const result = vec3Length(vec);
    const expected = Math.sqrt(1 * 1 + 2 * 2 + 3 * 3);
    expect(result).toBeCloseTo(expected, 10);
  });

  it("computes length of negative vector", () => {
    const vec: Vec3 = [-3, -4, 0];
    const result = vec3Length(vec);
    expect(result).toBe(5);
  });
});

describe("vec3Normalize", () => {
  it("normalizes unit vector", () => {
    const vec: Vec3 = [1, 0, 0];
    const result = vec3Normalize(vec);
    expect(result).toEqual([1, 0, 0]);
  });

  it("normalizes arbitrary vector", () => {
    const vec: Vec3 = [3, 4, 0];
    const result = vec3Normalize(vec);
    expect(result[0]).toBeCloseTo(0.6, 10);
    expect(result[1]).toBeCloseTo(0.8, 10);
    expect(result[2]).toBeCloseTo(0, 10);
    // Check length is 1
    const length = vec3Length(result);
    expect(length).toBeCloseTo(1, 10);
  });

  it("normalizes zero vector (should return zero)", () => {
    const vec: Vec3 = [0, 0, 0];
    const result = vec3Normalize(vec);
    expect(result).toEqual([0, 0, 0]);
  });

  it("normalizes very small vector", () => {
    const vec: Vec3 = [0.001, 0.002, 0.003];
    const result = vec3Normalize(vec);
    const length = vec3Length(result);
    expect(length).toBeCloseTo(1, 10);
  });

  it("normalizes negative vector", () => {
    const vec: Vec3 = [-3, -4, 0];
    const result = vec3Normalize(vec);
    expect(result[0]).toBeCloseTo(-0.6, 10);
    expect(result[1]).toBeCloseTo(-0.8, 10);
    expect(result[2]).toBeCloseTo(0, 10);
  });
});

describe("vec3Subtract", () => {
  it("subtracts two vectors", () => {
    const a: Vec3 = [5, 6, 7];
    const b: Vec3 = [1, 2, 3];
    const result = vec3Subtract(a, b);
    expect(result).toEqual([4, 4, 4]);
  });

  it("subtracts vector from itself (should give zero)", () => {
    const a: Vec3 = [1, 2, 3];
    const result = vec3Subtract(a, a);
    expect(result).toEqual([0, 0, 0]);
  });

  it("subtracts zero vector", () => {
    const a: Vec3 = [1, 2, 3];
    const b: Vec3 = [0, 0, 0];
    const result = vec3Subtract(a, b);
    expect(result).toEqual([1, 2, 3]);
  });

  it("subtracts negative vector", () => {
    const a: Vec3 = [1, 2, 3];
    const b: Vec3 = [-1, -2, -3];
    const result = vec3Subtract(a, b);
    expect(result).toEqual([2, 4, 6]);
  });
});

describe("vec3Scale", () => {
  it("scales vector by positive scalar", () => {
    const vec: Vec3 = [1, 2, 3];
    const result = vec3Scale(vec, 2);
    expect(result).toEqual([2, 4, 6]);
  });

  it("scales vector by zero (should give zero vector)", () => {
    const vec: Vec3 = [1, 2, 3];
    const result = vec3Scale(vec, 0);
    expect(result).toEqual([0, 0, 0]);
  });

  it("scales vector by negative scalar", () => {
    const vec: Vec3 = [1, 2, 3];
    const result = vec3Scale(vec, -2);
    expect(result).toEqual([-2, -4, -6]);
  });

  it("scales vector by one (should be unchanged)", () => {
    const vec: Vec3 = [1, 2, 3];
    const result = vec3Scale(vec, 1);
    expect(result).toEqual([1, 2, 3]);
  });

  it("scales zero vector", () => {
    const vec: Vec3 = [0, 0, 0];
    const result = vec3Scale(vec, 5);
    expect(result).toEqual([0, 0, 0]);
  });

  it("scales vector by fractional scalar", () => {
    const vec: Vec3 = [2, 4, 6];
    const result = vec3Scale(vec, 0.5);
    expect(result).toEqual([1, 2, 3]);
  });
});

describe("vec3Lerp", () => {
  it("interpolates between two vectors", () => {
    const a: Vec3 = [0, 0, 0];
    const b: Vec3 = [10, 20, 30];
    expect(vec3Lerp(a, b, 0)).toEqual([0, 0, 0]);
    expect(vec3Lerp(a, b, 1)).toEqual([10, 20, 30]);
    expect(vec3Lerp(a, b, 0.5)).toEqual([5, 10, 15]);
  });
});
