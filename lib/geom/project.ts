import { Plane3, Polyline2, Polyline3, Vec2, Vec3 } from "./geomTypes";
import { computeDefaultU, vec3Cross, vec3Dot, vec3Subtract } from "./vec3";

export interface ProjectedPolyline {
  pl2: Polyline2;
  pl3: Polyline3;
}

export function projectPolyline2ToPlane3(
  polyline: Polyline2,
  plane?: Plane3,
  skipClosingVertex?: boolean
): ProjectedPolyline {
  const pl2: Polyline2 = [];
  const pl3: Polyline3 = [];
  // If skipClosingVertex is true, exclude the last vertex (which duplicates the first in closed polylines)
  const rawCount = Math.floor(polyline.length / 2);
  const count = skipClosingVertex ? rawCount - 1 : rawCount;

  if (!plane) {
    // No plane - points stay in XY plane at z=0
    for (let i = 0; i < count; i++) {
      pl2.push(polyline[i * 2], polyline[i * 2 + 1]);
      pl3.push(polyline[i * 2], polyline[i * 2 + 1], 0);
    }
    return { pl2, pl3 };
  }

  // Build transformation from plane basis vectors
  const { origin, normal } = plane;
  const u = plane.u ?? computeDefaultU(normal);
  const v = vec3Cross(normal, u); // Y-axis = normal × u

  for (let i = 0; i < count; i++) {
    const x = polyline[i * 2];
    const y = polyline[i * 2 + 1];
    pl2.push(x, y);

    // worldPos = origin + x * u + y * v
    pl3.push(
      origin[0] + x * u[0] + y * v[0],
      origin[1] + x * u[1] + y * v[1],
      origin[2] + x * u[2] + y * v[2]
    );
  }

  return { pl2, pl3 };
}

// Project Polyline3 to Polyline2 (drop z-axis)
export function projectPolyline3ToWorldXY(polyline3: Polyline3): Polyline2 {
  const result: Polyline2 = [];
  const count = polyline3.length / 3;
  for (let i = 0; i < count; i++) {
    result.push(polyline3[i * 3], polyline3[i * 3 + 1]);
  }
  return result;
}

export function projectPolyline3ToPlane3(
  polyline3: Polyline3,
  plane: Plane3
): Polyline2 {
  const result: Polyline2 = [];
  const count = polyline3.length / 3;
  const { origin, normal } = plane;
  const u = plane.u ?? computeDefaultU(normal);
  const v = vec3Cross(normal, u);

  for (let i = 0; i < count; i++) {
    const p: Vec3 = [
      polyline3[i * 3],
      polyline3[i * 3 + 1],
      polyline3[i * 3 + 2],
    ];
    // Get vector from plane origin to point
    const toPoint = vec3Subtract(p, origin);
    // Project onto plane's local UV axes
    const localX = vec3Dot(toPoint, u);
    const localY = vec3Dot(toPoint, v);
    result.push(localX, localY);
  }

  return result;
}

export function projectVec2ToPlane3(point: Vec2, plane?: Plane3): Vec3 {
  const [x, y] = point;

  if (!plane) {
    // No plane - point stays in XY plane at z=0
    return [x, y, 0];
  }

  // Build transformation from plane basis vectors
  const { origin, normal } = plane;
  const u = plane.u ?? computeDefaultU(normal);
  const v = vec3Cross(normal, u); // Y-axis = normal × u

  // worldPos = origin + x * u + y * v
  return [
    origin[0] + x * u[0] + y * v[0],
    origin[1] + x * u[1] + y * v[1],
    origin[2] + x * u[2] + y * v[2],
  ];
}
