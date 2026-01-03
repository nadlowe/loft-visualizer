import { Vec3, Plane3 } from "./geomTypes";
import { mat4RotateAxis, Mat4 } from "./mat4";
import {
  computeDefaultU,
  vec3Normalize,
  vec3TransformDirection,
  vec3Subtract,
  vec3TransformPoint,
  vec3Add,
} from "./vec3";

/**
 * Plane3 operations
 */
/**
 * Creates a plane with a default u vector computed from the normal.
 * This ensures the plane has a stable in-plane orientation.
 */

export function plane3New(origin: Vec3, normal: Vec3, u?: Vec3): Plane3 {
  return {
    origin,
    normal,
    u: u || computeDefaultU(normal),
  };
}
/**
 * Rotates a plane around an axis.
 *
 * @param plane - The plane to rotate
 * @param axis - The rotation axis direction (will be normalized)
 * @param angleRad - Rotation angle in radians
 * @param pivotPoint - Point on the rotation axis (default: plane.origin)
 */

export function plane3Rotate(
  plane: Plane3,
  axis: Vec3,
  angleRad: number,
  pivotPoint?: Vec3
): Plane3 {
  const pivot = pivotPoint || plane.origin;

  // Normalize axis
  const axisNormalized = vec3Normalize(axis);

  // Create rotation matrix around axis
  const rotationMatrix = mat4RotateAxis(axisNormalized, angleRad);

  // Rotate normal: direction vectors rotate around origin (no translation)
  const rotatedNormal = vec3Normalize(
    vec3TransformDirection(plane.normal, rotationMatrix)
  );

  // Rotate origin: points rotate around pivot
  const originFromPivot = vec3Subtract(plane.origin, pivot);
  const rotatedOriginFromPivot = vec3TransformPoint(
    originFromPivot,
    rotationMatrix
  );
  const rotatedOrigin = vec3Add(rotatedOriginFromPivot, pivot);

  // Rotate u vector if provided: direction vectors rotate around origin
  let rotatedU: Vec3 | undefined;
  if (plane.u) {
    // u is a direction vector, but it's defined relative to the origin
    // So we need to rotate it around the pivot as well
    const uFromPivot = vec3Subtract(plane.u, pivot);
    const rotatedUFromPivot = vec3TransformDirection(
      uFromPivot,
      rotationMatrix
    );
    rotatedU = vec3Add(rotatedUFromPivot, pivot);
  } else {
    // Compute default u from rotated normal
    rotatedU = computeDefaultU(rotatedNormal);
  }

  const result: Plane3 = {
    origin: rotatedOrigin,
    normal: rotatedNormal,
    u: rotatedU,
  };

  return result;
}
/**
 * Barrel roll: Rotates the plane around its own normal.
 * This changes the in-plane orientation (which way is "up" in the plane)
 * without changing the plane's tilt.
 */

export function plane3BarrelRoll(plane: Plane3, angleRad: number): Plane3 {
  if (!plane.u) {
    // If no u vector, we can't do a proper barrel roll
    // Return plane with computed default u
    return plane3New(plane.origin, plane.normal);
  }

  // Create rotation matrix around normal
  const rotationMatrix = mat4RotateAxis(plane.normal, angleRad);

  // Rotate u vector around normal through origin
  // u is a direction vector relative to origin, so rotate it as a direction
  const uFromOrigin = vec3Subtract(plane.u, plane.origin);
  const rotatedUFromOrigin = vec3TransformDirection(
    uFromOrigin,
    rotationMatrix
  );
  const rotatedU = vec3Add(rotatedUFromOrigin, plane.origin);

  return {
    origin: plane.origin, // Unchanged
    normal: plane.normal, // Unchanged
    u: rotatedU,
  };
}

/**
 * Transforms a plane by a 4x4 transformation matrix.
 * Transforms origin as a point, and normal/u as direction vectors.
 */
export function plane3Transform(plane: Plane3, mat: Mat4): Plane3 {
  // Transform origin as a point (includes translation)
  const transformedOrigin = vec3TransformPoint(plane.origin, mat);

  // Transform normal as a direction vector (no translation)
  const transformedNormal = vec3Normalize(
    vec3TransformDirection(plane.normal, mat)
  );

  // Transform u vector as a direction vector (no translation)
  let transformedU: Vec3 | undefined;
  if (plane.u) {
    transformedU = vec3Normalize(vec3TransformDirection(plane.u, mat));
  } else {
    // Compute default u from transformed normal
    transformedU = computeDefaultU(transformedNormal);
  }

  return {
    origin: transformedOrigin,
    normal: transformedNormal,
    u: transformedU,
  };
}
