import { describe, expect, it } from "@jest/globals";
import { faceBarrelRoll, faceRotate } from "../lib/geom/face";
import { Face, Polygon, Vec3 } from "../lib/geom/geomTypes";
import { plane3New } from "../lib/geom/plane3";

describe("faceRotate", () => {
  it("rotates face without altering polygon", () => {
    const polygon: Polygon = [[0, 0, 1, 0, 1, 1, 0, 1, 0, 0]]; // Square
    const plane = plane3New([0, 0, 0], [0, 0, 1]);
    const face: Face = { plane, polygon };

    const axis: Vec3 = [1, 0, 0]; // X-axis (will change normal)
    const rotated = faceRotate(face, axis, Math.PI / 2);

    // Polygon should be unchanged
    expect(rotated.polygon).toEqual(polygon);
    expect(rotated.polygon).toBe(polygon); // Same reference

    // Plane should be rotated (normal should change)
    expect(rotated.plane.normal).not.toEqual(plane.normal);
  });

  it("rotates face around different pivot point", () => {
    const polygon: Polygon = [[0, 0, 1, 0, 1, 1, 0, 1, 0, 0]];
    const plane = plane3New([1, 2, 3], [0, 0, 1]);
    const face: Face = { plane, polygon };

    const axis: Vec3 = [0, 0, 1]; // Z-axis
    const pivot: Vec3 = [0, 0, 0];
    const rotated = faceRotate(face, axis, Math.PI / 2, pivot);

    // Polygon should be unchanged
    expect(rotated.polygon).toEqual(polygon);
    expect(rotated.polygon).toBe(polygon); // Same reference

    // Origin should be rotated
    expect(rotated.plane.origin).not.toEqual(plane.origin);
    expect(rotated.plane.origin[0]).toBeCloseTo(-2, 5);
    expect(rotated.plane.origin[1]).toBeCloseTo(1, 5);
    expect(rotated.plane.origin[2]).toBeCloseTo(3, 5);
  });

  it("rotates face 180 degrees around Y-axis", () => {
    const polygon: Polygon = [[0, 0, 1, 0, 1, 1, 0, 1, 0, 0]];
    const plane = plane3New([0, 0, 0], [0, 0, 1]);
    const face: Face = { plane, polygon };

    const axis: Vec3 = [0, 1, 0]; // Y-axis
    const rotated = faceRotate(face, axis, Math.PI);

    // Polygon unchanged
    expect(rotated.polygon).toBe(polygon);

    // Normal should be flipped
    expect(rotated.plane.normal[0]).toBeCloseTo(0, 5);
    expect(rotated.plane.normal[1]).toBeCloseTo(0, 5);
    expect(rotated.plane.normal[2]).toBeCloseTo(-1, 5);
  });

  it("rotates face with multiple polygon loops (with holes)", () => {
    const polygon: Polygon = [
      [0, 0, 2, 0, 2, 2, 0, 2, 0, 0], // Outer boundary
      [0.5, 0.5, 1.5, 0.5, 1.5, 1.5, 0.5, 1.5, 0.5, 0.5], // Hole
    ];
    const plane = plane3New([0, 0, 0], [0, 0, 1]);
    const face: Face = { plane, polygon };

    const axis: Vec3 = [1, 0, 0];
    const rotated = faceRotate(face, axis, Math.PI / 2);

    // All polygon loops should be unchanged
    expect(rotated.polygon).toEqual(polygon);
    expect(rotated.polygon).toBe(polygon); // Same reference
    expect(rotated.polygon.length).toBe(2);
  });

  it("preserves polygon data integrity after multiple rotations", () => {
    const polygon: Polygon = [[0, 0, 1, 0, 1, 1, 0, 1, 0, 0]];
    const plane = plane3New([0, 0, 0], [0, 0, 1]);
    const face: Face = { plane, polygon };

    const axis: Vec3 = [1, 0, 0];
    let rotated = faceRotate(face, axis, Math.PI / 4);
    rotated = faceRotate(rotated, axis, Math.PI / 4);
    rotated = faceRotate(rotated, [0, 1, 0], Math.PI / 4);

    // Polygon should still be unchanged after multiple rotations
    expect(rotated.polygon).toBe(polygon);
    expect(rotated.polygon).toEqual(polygon);
  });

  it("rotates face with custom u vector", () => {
    const polygon: Polygon = [[0, 0, 1, 0, 1, 1, 0, 1, 0, 0]];
    const u: Vec3 = [1, 0, 0];
    const plane = plane3New([0, 0, 0], [0, 0, 1], u);
    const face: Face = { plane, polygon };

    const axis: Vec3 = [0, 0, 1];
    const rotated = faceRotate(face, axis, Math.PI / 2);

    // Polygon unchanged
    expect(rotated.polygon).toBe(polygon);

    // u vector should be rotated
    expect(rotated.plane.u).toBeDefined();
    expect(rotated.plane.u![0]).toBeCloseTo(0, 5);
    expect(rotated.plane.u![1]).toBeCloseTo(1, 5);
  });
});

describe("faceBarrelRoll", () => {
  it("barrel rolls face without altering polygon", () => {
    const polygon: Polygon = [[0, 0, 1, 0, 1, 1, 0, 1, 0, 0]];
    const u: Vec3 = [1, 0, 0];
    const plane = plane3New([0, 0, 0], [0, 0, 1], u);
    const face: Face = { plane, polygon };

    const rolled = faceBarrelRoll(face, Math.PI / 2);

    // Polygon should be unchanged
    expect(rolled.polygon).toEqual(polygon);
    expect(rolled.polygon).toBe(polygon); // Same reference

    // Normal and origin should be unchanged
    expect(rolled.plane.normal).toEqual(plane.normal);
    expect(rolled.plane.origin).toEqual(plane.origin);

    // u should be rotated
    expect(rolled.plane.u).toBeDefined();
    expect(rolled.plane.u![0]).toBeCloseTo(0, 5);
    expect(rolled.plane.u![1]).toBeCloseTo(1, 5);
    expect(rolled.plane.u![2]).toBeCloseTo(0, 5);
  });

  it("barrel rolls face 180 degrees", () => {
    const polygon: Polygon = [[0, 0, 1, 0, 1, 1, 0, 1, 0, 0]];
    const u: Vec3 = [1, 0, 0];
    const plane = plane3New([0, 0, 0], [0, 0, 1], u);
    const face: Face = { plane, polygon };

    const rolled = faceBarrelRoll(face, Math.PI);

    // Polygon unchanged
    expect(rolled.polygon).toBe(polygon);

    // Normal and origin unchanged
    expect(rolled.plane.normal).toEqual(plane.normal);
    expect(rolled.plane.origin).toEqual(plane.origin);

    // u should be rotated 180 degrees
    expect(rolled.plane.u![0]).toBeCloseTo(-1, 5);
    expect(rolled.plane.u![1]).toBeCloseTo(0, 5);
    expect(rolled.plane.u![2]).toBeCloseTo(0, 5);
  });

  it("barrel rolls face 360 degrees (full rotation)", () => {
    const polygon: Polygon = [[0, 0, 1, 0, 1, 1, 0, 1, 0, 0]];
    const u: Vec3 = [1, 0, 0];
    const plane = plane3New([0, 0, 0], [0, 0, 1], u);
    const face: Face = { plane, polygon };

    const rolled = faceBarrelRoll(face, 2 * Math.PI);

    // Polygon unchanged
    expect(rolled.polygon).toBe(polygon);

    // Normal and origin unchanged
    expect(rolled.plane.normal).toEqual(plane.normal);
    expect(rolled.plane.origin).toEqual(plane.origin);

    // u should be back to original (within floating point precision)
    expect(rolled.plane.u![0]).toBeCloseTo(1, 5);
    expect(rolled.plane.u![1]).toBeCloseTo(0, 5);
    expect(rolled.plane.u![2]).toBeCloseTo(0, 5);
  });

  it("barrel rolls face with multiple polygon loops", () => {
    const polygon: Polygon = [
      [0, 0, 2, 0, 2, 2, 0, 2, 0, 0],
      [0.5, 0.5, 1.5, 0.5, 1.5, 1.5, 0.5, 1.5, 0.5, 0.5],
    ];
    const u: Vec3 = [1, 0, 0];
    const plane = plane3New([0, 0, 0], [0, 0, 1], u);
    const face: Face = { plane, polygon };

    const rolled = faceBarrelRoll(face, Math.PI / 2);

    // All polygon loops should be unchanged
    expect(rolled.polygon).toBe(polygon);
    expect(rolled.polygon.length).toBe(2);
  });

  it("preserves polygon after multiple barrel rolls", () => {
    const polygon: Polygon = [[0, 0, 1, 0, 1, 1, 0, 1, 0, 0]];
    const u: Vec3 = [1, 0, 0];
    const plane = plane3New([0, 0, 0], [0, 0, 1], u);
    const face: Face = { plane, polygon };

    let rolled = faceBarrelRoll(face, Math.PI / 4);
    rolled = faceBarrelRoll(rolled, Math.PI / 4);
    rolled = faceBarrelRoll(rolled, Math.PI / 4);

    // Polygon should still be unchanged
    expect(rolled.polygon).toBe(polygon);
  });

  it("barrel rolls face without u vector (computes default)", () => {
    const polygon: Polygon = [[0, 0, 1, 0, 1, 1, 0, 1, 0, 0]];
    const plane = plane3New([0, 0, 0], [0, 0, 1]);
    // Remove u to test default computation
    const face: Face = { plane: { ...plane, u: undefined }, polygon };

    const rolled = faceBarrelRoll(face, Math.PI / 2);

    // Polygon unchanged
    expect(rolled.polygon).toBe(polygon);

    // Should compute default u
    expect(rolled.plane.u).toBeDefined();
    const dot =
      rolled.plane.u![0] * rolled.plane.normal[0] +
      rolled.plane.u![1] * rolled.plane.normal[1] +
      rolled.plane.u![2] * rolled.plane.normal[2];
    expect(dot).toBeCloseTo(0, 10); // Orthogonal
  });

  it("barrel rolls face on tilted plane", () => {
    const polygon: Polygon = [[0, 0, 1, 0, 1, 1, 0, 1, 0, 0]];
    // Tilted plane: normal at 45 degrees
    const normal: Vec3 = [0, Math.sin(Math.PI / 4), Math.cos(Math.PI / 4)];
    const u: Vec3 = [1, 0, 0];
    const plane = plane3New([0, 0, 0], normal, u);
    const face: Face = { plane, polygon };

    const rolled = faceBarrelRoll(face, Math.PI / 2);

    // Polygon unchanged
    expect(rolled.polygon).toBe(polygon);

    // Normal unchanged (still tilted)
    expect(rolled.plane.normal).toEqual(plane.normal);

    // u should be rotated around the tilted normal
    expect(rolled.plane.u).toBeDefined();
    // u should still be orthogonal to normal
    const dot =
      rolled.plane.u![0] * rolled.plane.normal[0] +
      rolled.plane.u![1] * rolled.plane.normal[1] +
      rolled.plane.u![2] * rolled.plane.normal[2];
    expect(dot).toBeCloseTo(0, 10);
  });
});
