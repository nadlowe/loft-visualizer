import { Plane3, Vec3 } from "./geomTypes";
import { computeDefaultU, vec3Normalize, vec3Subtract } from "./vec3";

export function plane3New(origin: Vec3, normal: Vec3, u?: Vec3): Plane3 {
  return {
    origin,
    normal,
    u: u || computeDefaultU(normal),
  };
}

export function normalFromVec3sOnNormalAxis(vec3A: Vec3, vec3B: Vec3): Vec3 {
  return vec3Normalize(vec3Subtract(vec3B, vec3A));
}

export function plane3FromNormal(origin: Vec3, normal: Vec3): Plane3 {
  return {
    origin,
    normal,
    u: computeDefaultU(normal),
  };
}
