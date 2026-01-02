import { Vec3 } from "./geomTypes";
import { Mat4 } from "./mat4";

/**
 * Computes a default in-plane orientation vector (u) from a normal.
 * This provides a stable, deterministic u vector that's orthogonal to the normal.
 * Uses geom X-axis [1, 0, 0] as the primary reference direction.
 */

export function computeDefaultU(normal: Vec3): Vec3 {
  // Use geom X-axis [1, 0, 0] as reference
  const reference: Vec3 = [1, 0, 0];

  // Project reference onto plane (remove component along normal)
  const dot = vec3Dot(reference, normal);
  let uVec = vec3Subtract(reference, vec3Scale(normal, dot));

  // If u is too small (normal is parallel to reference), use geom Y-axis instead
  if (vec3Length(uVec) < 0.001) {
    // geom Y-axis [0, 1, 0]
    const refY: Vec3 = [0, 1, 0];
    const dotY = vec3Dot(refY, normal);
    uVec = vec3Subtract(refY, vec3Scale(normal, dotY));
  }

  // Normalize
  return vec3Normalize(uVec);
}
/**
 * Transforms a 3D vector by a 4x4 matrix (treats as direction vector, w=0)
 */

export function vec3TransformDirection(vec: Vec3, mat: Mat4): Vec3 {
  const [x, y, z] = vec;
  return [
    mat[0] * x + mat[1] * y + mat[2] * z,
    mat[4] * x + mat[5] * y + mat[6] * z,
    mat[8] * x + mat[9] * y + mat[10] * z,
  ];
}
/**
 * Transforms a 3D point by a 4x4 matrix (treats as point, w=1)
 */
export function vec3TransformPoint(vec: Vec3, mat: Mat4): Vec3 {
  const [x, y, z] = vec;
  return [
    mat[0] * x + mat[1] * y + mat[2] * z + mat[3],
    mat[4] * x + mat[5] * y + mat[6] * z + mat[7],
    mat[8] * x + mat[9] * y + mat[10] * z + mat[11],
  ];
}
/**
 * Helper: Vector3 operations
 */
/**
 * Dot product of two vectors
 */
export function vec3Dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
/**
 * Cross product of two vectors
 */
export function vec3Cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
/**
 * Length of a vector
 */
export function vec3Length(vec: Vec3): number {
  return Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
}
/**
 * Normalize a vector
 */
export function vec3Normalize(vec: Vec3): Vec3 {
  const len = vec3Length(vec);
  if (len < 1e-10) {
    return [0, 0, 0];
  }
  return [vec[0] / len, vec[1] / len, vec[2] / len];
}
/**
 * Subtract two vectors: a - b
 */
export function vec3Subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
/**
 * Add two vectors: a + b
 */
export function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
/**
 * Scale a vector by a scalar
 */
export function vec3Scale(vec: Vec3, scalar: number): Vec3 {
  return [vec[0] * scalar, vec[1] * scalar, vec[2] * scalar];
}
