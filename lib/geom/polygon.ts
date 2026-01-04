import { Polygon } from "./geomTypes";
import { Mat3, mat3Rotate, mat3Translate } from "./mat3";
import { polyline2Transform } from "./polyline2";

export function polygonTransform(polygon: Polygon, mat: Mat3): Polygon {
  const result: Polygon = [];
  for (let i = 0; i < polygon.length; i++) {
    result.push(polyline2Transform(polygon[i], mat));
  }
  return result;
}

export function polygonTranslate(
  polygon: Polygon,
  translationX: number,
  translationY: number
): Polygon {
  return polygonTransform(polygon, mat3Translate(translationX, translationY));
}

export function polygonRotate(
  polygon: Polygon,
  angleRad: number,
  originX: number,
  originY: number
): Polygon {
  return polygonTransform(polygon, mat3Rotate(angleRad, originX, originY));
}
