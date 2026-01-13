export const DIST_EPSILON = 1e-6;
export const PARAM_EPSILON = 1e-8;

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}
