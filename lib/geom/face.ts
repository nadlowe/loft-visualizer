import { Face, Vec3 } from "./geomTypes";
import { Mat4 } from "./mat4";
import { plane3BarrelRoll, plane3Rotate, plane3Transform } from "./plane3";

export function faceRotate(
  face: Face,
  axis: Vec3,
  angleRad: number,
  pivotPoint?: Vec3
): Face {
  return {
    plane: plane3Rotate(face.plane, axis, angleRad, pivotPoint),
    polygon: face.polygon,
  };
}

export function faceBarrelRoll(face: Face, angleRad: number): Face {
  return {
    plane: plane3BarrelRoll(face.plane, angleRad),
    polygon: face.polygon,
  };
}

export function face3Transform(face: Face, mat: Mat4): Face {
  return {
    plane: plane3Transform(face.plane, mat),
    polygon: face.polygon,
  };
}
