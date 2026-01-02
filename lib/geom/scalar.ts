export const DIST_EPSILON = 1e-6;

export function degreeToRadian(degree: number): number {
  return (degree * Math.PI) / 180;
}

export function radianToDegree(radian: number): number {
  return (radian * 180) / Math.PI;
}
