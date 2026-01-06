import { describe, expect, it } from "@jest/globals";
import { Plane3, Vec3 } from "../lib/geom/geomTypes";
import { plane3BarrelRoll, plane3New, plane3Rotate } from "../lib/geom/plane3";
import { computeDefaultU } from "../lib/geom/vec3";

describe("computeDefaultU", () => {
  it("computes u vector orthogonal to normal pointing in X direction", () => {
    const normal: Vec3 = [0, 0, 1]; // Z-axis (up)
    const u = computeDefaultU(normal);

    // Should be orthogonal to normal
    const dot = u[0] * normal[0] + u[1] * normal[1] + u[2] * normal[2];
    expect(dot).toBeCloseTo(0, 10);

    // Should be normalized
    const length = Math.sqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2]);
    expect(length).toBeCloseTo(1, 10);

    // Should point in X direction (or close to it)
    expect(u[0]).toBeGreaterThan(0.9);
  });

  it("computes u vector for normal pointing in Y direction", () => {
    const normal: Vec3 = [0, 1, 0]; // Y-axis
    const u = computeDefaultU(normal);

    // Should be orthogonal to normal
    const dot = u[0] * normal[0] + u[1] * normal[1] + u[2] * normal[2];
    expect(dot).toBeCloseTo(0, 10);

    // Should be normalized
    const length = Math.sqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2]);
    expect(length).toBeCloseTo(1, 10);
  });

  it("computes u vector for normal pointing in X direction (uses Y fallback)", () => {
    const normal: Vec3 = [1, 0, 0]; // X-axis (parallel to reference)
    const u = computeDefaultU(normal);

    // Should be orthogonal to normal
    const dot = u[0] * normal[0] + u[1] * normal[1] + u[2] * normal[2];
    expect(dot).toBeCloseTo(0, 10);

    // Should be normalized
    const length = Math.sqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2]);
    expect(length).toBeCloseTo(1, 10);
  });
});

describe("createPlane3", () => {
  it("creates plane with default u vector", () => {
    const origin: Vec3 = [0, 0, 0];
    const normal: Vec3 = [0, 0, 1];
    const plane = plane3New(origin, normal);

    expect(plane.origin).toEqual(origin);
    expect(plane.normal).toEqual(normal);
    expect(plane.u).toBeDefined();

    // u should be orthogonal to normal
    const dot =
      plane.u![0] * normal[0] +
      plane.u![1] * normal[1] +
      plane.u![2] * normal[2];
    expect(dot).toBeCloseTo(0, 10);
  });

  it("creates plane with provided u vector", () => {
    const origin: Vec3 = [0, 0, 0];
    const normal: Vec3 = [0, 0, 1];
    const u: Vec3 = [1, 0, 0];
    const plane = plane3New(origin, normal, u);

    expect(plane.origin).toEqual(origin);
    expect(plane.normal).toEqual(normal);
    expect(plane.u).toEqual(u);
  });
});

describe("plane3Rotate", () => {
  it("rotates plane 90 degrees around X-axis", () => {
    const plane = plane3New([0, 0, 0], [0, 0, 1]); // Horizontal plane, normal up
    const axis: Vec3 = [1, 0, 0]; // X-axis
    const rotated = plane3Rotate(plane, axis, Math.PI / 2);

    // Normal should rotate from [0, 0, 1] to [0, -1, 0] (right-hand rule)
    expect(rotated.normal[0]).toBeCloseTo(0, 5);
    expect(rotated.normal[1]).toBeCloseTo(-1, 5);
    expect(rotated.normal[2]).toBeCloseTo(0, 5);
  });

  it("rotates plane around axis through origin", () => {
    const plane = plane3New([0, 0, 0], [0, 0, 1]);
    const axis: Vec3 = [1, 0, 0]; // X-axis
    const rotated = plane3Rotate(plane, axis, Math.PI / 2);

    // Normal should be normalized
    const length = Math.sqrt(
      rotated.normal[0] * rotated.normal[0] +
        rotated.normal[1] * rotated.normal[1] +
        rotated.normal[2] * rotated.normal[2]
    );
    expect(length).toBeCloseTo(1, 10);
  });

  it("rotates plane around axis through different pivot point", () => {
    const plane = plane3New([1, 2, 3], [0, 0, 1]);
    const axis: Vec3 = [0, 0, 1]; // Z-axis
    const pivot: Vec3 = [0, 0, 0];
    const rotated = plane3Rotate(plane, axis, Math.PI / 2, pivot);

    // Origin should rotate around pivot
    expect(rotated.origin[0]).toBeCloseTo(-2, 5);
    expect(rotated.origin[1]).toBeCloseTo(1, 5);
    expect(rotated.origin[2]).toBeCloseTo(3, 5);
  });

  it("preserves u vector when rotating", () => {
    const u: Vec3 = [1, 0, 0];
    const plane = plane3New([0, 0, 0], [0, 0, 1], u);
    const axis: Vec3 = [0, 0, 1]; // Z-axis
    const rotated = plane3Rotate(plane, axis, Math.PI / 2);

    // u should be rotated
    expect(rotated.u).toBeDefined();
    expect(rotated.u![0]).toBeCloseTo(0, 5);
    expect(rotated.u![1]).toBeCloseTo(1, 5);
  });

  it("computes default u when u is not provided", () => {
    const plane: Plane3 = {
      origin: [0, 0, 0],
      normal: [0, 0, 1],
      // u is undefined
    };
    const axis: Vec3 = [0, 0, 1];
    const rotated = plane3Rotate(plane, axis, Math.PI / 2);

    // Should compute default u from rotated normal
    expect(rotated.u).toBeDefined();
    const dot =
      rotated.u![0] * rotated.normal[0] +
      rotated.u![1] * rotated.normal[1] +
      rotated.u![2] * rotated.normal[2];
    expect(dot).toBeCloseTo(0, 10);
  });
});

describe("plane3BarrelRoll", () => {
  it("barrel rolls plane 90 degrees (rotates u around normal)", () => {
    const u: Vec3 = [1, 0, 0];
    const plane = plane3New([0, 0, 0], [0, 0, 1], u);
    const rolled = plane3BarrelRoll(plane, Math.PI / 2);

    // Normal and origin should be unchanged
    expect(rolled.normal).toEqual(plane.normal);
    expect(rolled.origin).toEqual(plane.origin);

    // u should be rotated around normal
    expect(rolled.u).toBeDefined();
    // After 90° rotation around Z, [1, 0, 0] should become [0, 1, 0]
    expect(rolled.u![0]).toBeCloseTo(0, 5);
    expect(rolled.u![1]).toBeCloseTo(1, 5);
    expect(rolled.u![2]).toBeCloseTo(0, 5);
  });

  it("barrel rolls plane 180 degrees", () => {
    const u: Vec3 = [1, 0, 0];
    const plane = plane3New([0, 0, 0], [0, 0, 1], u);
    const rolled = plane3BarrelRoll(plane, Math.PI);

    // Normal and origin should be unchanged
    expect(rolled.normal).toEqual(plane.normal);
    expect(rolled.origin).toEqual(plane.origin);

    // u should be rotated 180 degrees
    expect(rolled.u![0]).toBeCloseTo(-1, 5);
    expect(rolled.u![1]).toBeCloseTo(0, 5);
    expect(rolled.u![2]).toBeCloseTo(0, 5);
  });

  it("computes default u when u is not provided", () => {
    const plane: Plane3 = {
      origin: [0, 0, 0],
      normal: [0, 0, 1],
      // u is undefined
    };
    const rolled = plane3BarrelRoll(plane, Math.PI / 2);

    // Should compute default u
    expect(rolled.u).toBeDefined();
    const dot =
      rolled.u![0] * rolled.normal[0] +
      rolled.u![1] * rolled.normal[1] +
      rolled.u![2] * rolled.normal[2];
    expect(dot).toBeCloseTo(0, 10);
  });

  it("preserves u vector length after barrel roll", () => {
    const u: Vec3 = [1, 0, 0];
    const plane = plane3New([0, 0, 0], [0, 0, 1], u);
    const rolled = plane3BarrelRoll(plane, Math.PI / 4);

    const originalLength = Math.sqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2]);
    const rolledLength = Math.sqrt(
      rolled.u![0] * rolled.u![0] +
        rolled.u![1] * rolled.u![1] +
        rolled.u![2] * rolled.u![2]
    );
    expect(rolledLength).toBeCloseTo(originalLength, 10);
  });
});
