import { Vec3, Face } from "./geomTypes";
import { plane3Rotate, plane3BarrelRoll, plane3Transform } from "./plane3";
import { Mat4 } from "./mat4";

/**
 * Rotates a face without altering the polygon.
 */
export function faceRotate(
  face: Face,
  axis: Vec3,
  angleRad: number,
  pivotPoint?: Vec3
): Face {
  return {
    plane: plane3Rotate(face.plane, axis, angleRad, pivotPoint),
    polygon: face.polygon, // Unchanged
  };
}

/**
 * Barrel rolls a face (rotates around the plane's normal) without altering the polygon.
 */
export function faceBarrelRoll(face: Face, angleRad: number): Face {
  return {
    plane: plane3BarrelRoll(face.plane, angleRad),
    polygon: face.polygon, // Unchanged
  };
}

/**
 * Transforms a face by a 4x4 transformation matrix.
 * Transforms the plane while keeping the polygon unchanged.
 */
export function face3Transform(face: Face, mat: Mat4): Face {
  return {
    plane: plane3Transform(face.plane, mat),
    polygon: face.polygon, // Unchanged
  };
}
