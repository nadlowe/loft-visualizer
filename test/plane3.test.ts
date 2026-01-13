import { describe, expect, it } from "@jest/globals";
import { Vec3 } from "../lib/geom/geomTypes";
import { plane3New } from "../lib/geom/plane3";
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
