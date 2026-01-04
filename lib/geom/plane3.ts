import { Plane3, Vec3 } from "./geomTypes";
import { Mat4, mat4RotateAxis } from "./mat4";
import {
  computeDefaultU,
  vec3Add,
  vec3Normalize,
  vec3Subtract,
  vec3TransformDirection,
  vec3TransformPoint,
} from "./vec3";

export function plane3New(origin: Vec3, normal: Vec3, u?: Vec3): Plane3 {
  return {
    origin,
    normal,
    u: u || computeDefaultU(normal),
  };
}

export function plane3Rotate(
  plane: Plane3,
  axis: Vec3,
  angleRad: number,
  pivotPoint?: Vec3
): Plane3 {
  const pivot = pivotPoint || plane.origin;
  const axisNormalized = vec3Normalize(axis);
  const rotationMatrix = mat4RotateAxis(axisNormalized, angleRad);

  const rotatedNormal = vec3Normalize(
    vec3TransformDirection(plane.normal, rotationMatrix)
  );

  const originFromPivot = vec3Subtract(plane.origin, pivot);
  const rotatedOriginFromPivot = vec3TransformPoint(
    originFromPivot,
    rotationMatrix
  );
  const rotatedOrigin = vec3Add(rotatedOriginFromPivot, pivot);

  let rotatedU: Vec3 | undefined;
  if (plane.u) {
    const uFromPivot = vec3Subtract(plane.u, pivot);
    const rotatedUFromPivot = vec3TransformDirection(
      uFromPivot,
      rotationMatrix
    );
    rotatedU = vec3Add(rotatedUFromPivot, pivot);
  } else {
    rotatedU = computeDefaultU(rotatedNormal);
  }

  const result: Plane3 = {
    origin: rotatedOrigin,
    normal: rotatedNormal,
    u: rotatedU,
  };

  return result;
}

export function plane3BarrelRoll(plane: Plane3, angleRad: number): Plane3 {
  if (!plane.u) {
    return plane3New(plane.origin, plane.normal);
  }

  const rotationMatrix = mat4RotateAxis(plane.normal, angleRad);
  const uFromOrigin = vec3Subtract(plane.u, plane.origin);
  const rotatedUFromOrigin = vec3TransformDirection(
    uFromOrigin,
    rotationMatrix
  );
  const rotatedU = vec3Add(rotatedUFromOrigin, plane.origin);

  return {
    origin: plane.origin,
    normal: plane.normal,
    u: rotatedU,
  };
}

export function plane3Transform(plane: Plane3, mat: Mat4): Plane3 {
  const transformedOrigin = vec3TransformPoint(plane.origin, mat);
  const transformedNormal = vec3Normalize(
    vec3TransformDirection(plane.normal, mat)
  );

  let transformedU: Vec3 | undefined;
  if (plane.u) {
    transformedU = vec3Normalize(vec3TransformDirection(plane.u, mat));
  } else {
    transformedU = computeDefaultU(transformedNormal);
  }

  return {
    origin: transformedOrigin,
    normal: transformedNormal,
    u: transformedU,
  };
}
