import { describe, it, expect } from "@jest/globals";
import {
  computeDefaultU,
  vec3TransformDirection,
  vec3TransformPoint,
  vec3Dot,
  vec3Cross,
  vec3Length,
  vec3Normalize,
  vec3Subtract,
  vec3Add,
  vec3Scale,
  vec3Negate,
  vec3Rotate,
} from "../lib/geom/vec3";
import { Vec3 } from "../lib/geom/geomTypes";
import {
  mat4Identity,
  mat4Translate,
  mat4RotateAxis,
  mat4Multiply,
} from "../lib/geom/mat4";

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

describe("vec3TransformDirection", () => {
  it("transforms direction vector with identity matrix", () => {
    const vec: Vec3 = [1, 2, 3];
    const mat = mat4Identity();
    const result = vec3TransformDirection(vec, mat);
    expect(result).toEqual([1, 2, 3]);
  });

  it("transforms direction vector with translation matrix (should ignore translation)", () => {
    const vec: Vec3 = [1, 2, 3];
    const mat = mat4Translate(5, 10, 15);
    const result = vec3TransformDirection(vec, mat);
    // Direction vectors should not be affected by translation
    expect(result).toEqual([1, 2, 3]);
  });

  it("transforms direction vector with rotation matrix (90 degrees around Z)", () => {
    const vec: Vec3 = [1, 0, 0];
    const mat = mat4RotateAxis([0, 0, 1], Math.PI / 2);
    const result = vec3TransformDirection(vec, mat);
    expect(result[0]).toBeCloseTo(0, 10);
    expect(result[1]).toBeCloseTo(1, 10);
    expect(result[2]).toBeCloseTo(0, 10);
  });

  it("transforms direction vector with rotation matrix (180 degrees around X)", () => {
    const vec: Vec3 = [0, 1, 0];
    const mat = mat4RotateAxis([1, 0, 0], Math.PI);
    const result = vec3TransformDirection(vec, mat);
    expect(result[0]).toBeCloseTo(0, 10);
    expect(result[1]).toBeCloseTo(-1, 10);
    expect(result[2]).toBeCloseTo(0, 10);
  });
});

describe("vec3TransformPoint", () => {
  it("transforms point with identity matrix", () => {
    const vec: Vec3 = [1, 2, 3];
    const mat = mat4Identity();
    const result = vec3TransformPoint(vec, mat);
    expect(result).toEqual([1, 2, 3]);
  });

  it("transforms point with translation matrix", () => {
    const vec: Vec3 = [1, 2, 3];
    const mat = mat4Translate(5, 10, 15);
    const result = vec3TransformPoint(vec, mat);
    expect(result).toEqual([6, 12, 18]);
  });

  it("transforms point at origin with translation", () => {
    const vec: Vec3 = [0, 0, 0];
    const mat = mat4Translate(5, 10, 15);
    const result = vec3TransformPoint(vec, mat);
    expect(result).toEqual([5, 10, 15]);
  });

  it("transforms point with rotation matrix (90 degrees around Z)", () => {
    const vec: Vec3 = [1, 0, 0];
    const mat = mat4RotateAxis([0, 0, 1], Math.PI / 2);
    const result = vec3TransformPoint(vec, mat);
    expect(result[0]).toBeCloseTo(0, 10);
    expect(result[1]).toBeCloseTo(1, 10);
    expect(result[2]).toBeCloseTo(0, 10);
  });

  it("transforms point with combined rotation and translation", () => {
    const vec: Vec3 = [1, 0, 0];
    const rotMat = mat4RotateAxis([0, 0, 1], Math.PI / 2);
    const transMat = mat4Translate(5, 10, 15);
    // First rotate, then translate
    const combined = mat4Multiply(transMat, rotMat);
    const result = vec3TransformPoint(vec, combined);
    // Rotated to [0, 1, 0], then translated by [5, 10, 15]
    expect(result[0]).toBeCloseTo(5, 10);
    expect(result[1]).toBeCloseTo(11, 10);
    expect(result[2]).toBeCloseTo(15, 10);
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

describe("vec3Add", () => {
  it("adds two vectors", () => {
    const a: Vec3 = [1, 2, 3];
    const b: Vec3 = [4, 5, 6];
    const result = vec3Add(a, b);
    expect(result).toEqual([5, 7, 9]);
  });

  it("adds vector to zero vector", () => {
    const a: Vec3 = [1, 2, 3];
    const b: Vec3 = [0, 0, 0];
    const result = vec3Add(a, b);
    expect(result).toEqual([1, 2, 3]);
  });

  it("adds negative vector", () => {
    const a: Vec3 = [5, 6, 7];
    const b: Vec3 = [-1, -2, -3];
    const result = vec3Add(a, b);
    expect(result).toEqual([4, 4, 4]);
  });

  it("adds vector to itself", () => {
    const a: Vec3 = [1, 2, 3];
    const result = vec3Add(a, a);
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

describe("vec3Negate", () => {
  it("negates positive vector", () => {
    const vec: Vec3 = [1, 2, 3];
    const result = vec3Negate(vec);
    expect(result).toEqual([-1, -2, -3]);
  });

  it("negates negative vector", () => {
    const vec: Vec3 = [-1, -2, -3];
    const result = vec3Negate(vec);
    expect(result).toEqual([1, 2, 3]);
  });

  it("negates zero vector", () => {
    const vec: Vec3 = [0, 0, 0];
    const result = vec3Negate(vec);
    expect(Math.abs(result[0])).toBe(0);
    expect(Math.abs(result[1])).toBe(0);
    expect(Math.abs(result[2])).toBe(0);
  });

  it("negates mixed sign vector", () => {
    const vec: Vec3 = [1, -2, 3];
    const result = vec3Negate(vec);
    expect(result).toEqual([-1, 2, -3]);
  });
});

describe("vec3Rotate", () => {
  it("rotates vector around Z axis (90 degrees)", () => {
    const vec: Vec3 = [1, 0, 0];
    const result = vec3Rotate(vec, Math.PI / 2);
    expect(result[0]).toBeCloseTo(0, 10);
    expect(result[1]).toBeCloseTo(1, 10);
    expect(result[2]).toBeCloseTo(0, 10);
  });

  it("rotates vector around Z axis (180 degrees)", () => {
    const vec: Vec3 = [1, 0, 0];
    const result = vec3Rotate(vec, Math.PI);
    expect(result[0]).toBeCloseTo(-1, 10);
    expect(result[1]).toBeCloseTo(0, 10);
    expect(result[2]).toBeCloseTo(0, 10);
  });

  it("rotates vector around Z axis (360 degrees, should be unchanged)", () => {
    const vec: Vec3 = [1, 2, 3];
    const result = vec3Rotate(vec, 2 * Math.PI);
    expect(result[0]).toBeCloseTo(1, 10);
    expect(result[1]).toBeCloseTo(2, 10);
    expect(result[2]).toBeCloseTo(3, 10);
  });

  it("rotates vector around Z axis (45 degrees)", () => {
    const vec: Vec3 = [1, 0, 0];
    const result = vec3Rotate(vec, Math.PI / 4);
    const expectedX = Math.cos(Math.PI / 4);
    const expectedY = Math.sin(Math.PI / 4);
    expect(result[0]).toBeCloseTo(expectedX, 10);
    expect(result[1]).toBeCloseTo(expectedY, 10);
    expect(result[2]).toBeCloseTo(0, 10);
  });

  it("rotates vector around Z axis (270 degrees)", () => {
    const vec: Vec3 = [1, 0, 0];
    const result = vec3Rotate(vec, (3 * Math.PI) / 2);
    expect(result[0]).toBeCloseTo(0, 10);
    expect(result[1]).toBeCloseTo(-1, 10);
    expect(result[2]).toBeCloseTo(0, 10);
  });

  it("rotates vector with non-zero Z component (Z should be unchanged)", () => {
    const vec: Vec3 = [1, 0, 5];
    const result = vec3Rotate(vec, Math.PI / 2);
    expect(result[0]).toBeCloseTo(0, 10);
    expect(result[1]).toBeCloseTo(1, 10);
    expect(result[2]).toBeCloseTo(5, 10);
  });

  it("rotates vector by zero radians (should be unchanged)", () => {
    const vec: Vec3 = [1, 2, 3];
    const result = vec3Rotate(vec, 0);
    expect(result).toEqual([1, 2, 3]);
  });

  it("rotates vector at origin in XY plane", () => {
    const vec: Vec3 = [0, 0, 0];
    const result = vec3Rotate(vec, Math.PI / 2);
    expect(result).toEqual([0, 0, 0]);
  });
});

