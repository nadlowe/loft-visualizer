import { Vec3 } from "./geomTypes";
import { DIST_EPSILON } from "./scalar";

export function computeDefaultU(normal: Vec3): Vec3 {
  // Use geom X-axis [1, 0, 0] as reference
  const reference: Vec3 = [1, 0, 0];

  // Project reference onto plane (remove component along normal)
  const dot = vec3Dot(reference, normal);
  let uVec = vec3Subtract(reference, vec3Scale(normal, dot));

  // If u is too small (normal is parallel to reference), use geom Y-axis instead
  if (vec3Length(uVec) < DIST_EPSILON) {
    // geom Y-axis [0, 1, 0]
    const refY: Vec3 = [0, 1, 0];
    const dotY = vec3Dot(refY, normal);
    uVec = vec3Subtract(refY, vec3Scale(normal, dotY));
  }

  // Normalize
  return vec3Normalize(uVec);
}

export function vec3Dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function vec3Cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function vec3Length(vec: Vec3): number {
  return Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
}

export function vec3Normalize(vec: Vec3): Vec3 {
  const len = vec3Length(vec);
  if (len < DIST_EPSILON) {
    return [0, 0, 0];
  }
  return [vec[0] / len, vec[1] / len, vec[2] / len];
}

export function vec3Subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vec3Scale(vec: Vec3, scalar: number): Vec3 {
  return [vec[0] * scalar, vec[1] * scalar, vec[2] * scalar];
}

export function vec3Lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}
