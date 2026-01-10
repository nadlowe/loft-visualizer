import { Plane3, Vec3 } from "./geomTypes";
import { computeDefaultU } from "./vec3";

export function plane3New(origin: Vec3, normal: Vec3, u?: Vec3): Plane3 {
  return {
    origin,
    normal,
    u: u || computeDefaultU(normal),
  };
}
