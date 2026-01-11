import { Plane3, Polyline2, Polyline3, Vec2 } from "./geomTypes";
import { normalFromVec3sOnNormalAxis, plane3FromNormal } from "./plane3";
import { polyline2Centroid } from "./polyline2";
import { projectPolyline3ToPlane3, projectVec2ToPlane3 } from "./project";
import { vec2Distance } from "./vec2";

export interface AlignedPolylines {
  seamIndexA: number;
  seamIndexB: number;
}

export function determineLoftSeam(
  pl2A: Polyline2,
  plane3A: Plane3,
  pl3A: Polyline3,
  pl2B: Polyline2,
  plane3B: Plane3,
  pl3B: Polyline3
): AlignedPolylines {
  const [xA, yA, zA] = projectVec2ToPlane3(polyline2Centroid(pl2A), plane3A);
  const [xB, yB, zB] = projectVec2ToPlane3(polyline2Centroid(pl2B), plane3B);

  const normal = normalFromVec3sOnNormalAxis([xA, yA, zA], [xB, yB, zB]);
  const plane3 = plane3FromNormal([xA, yA, zA], normal);

  const polyA = projectPolyline3ToPlane3(pl3A, plane3);
  const polyB = projectPolyline3ToPlane3(pl3B, plane3);

  // TODO: keep these for debugging
  // debugVec3([xA, yA, zA], "#ff00ff", "vec3A");
  // debugVec3([xB, yB, zB], "#00ff00", "vec3B");
  // const { pl3: debugA } = projectPolyline2ToPlane3(polyA, plane3);
  // const { pl3: debugB } = projectPolyline2ToPlane3(polyB, plane3);
  // debugPolyline3s([debugA, debugB], ["#ff00ff", "#00ff00"], ["polyA", "polyB"]);

  // Find the two closest points to create the start seam
  const { idxA, idxB } = findClosestVertexPair(polyA, polyB);

  // debug the seam vertices
  // const seamA: Vec3 = [pl3A[idxA * 3], pl3A[idxA * 3 + 1], pl3A[idxA * 3 + 2]];
  // const seamB: Vec3 = [pl3B[idxB * 3], pl3B[idxB * 3 + 1], pl3B[idxB * 3 + 2]];
  // debugVec3(seamA, "#ff00ff", "seamA", 3);
  // debugVec3(seamB, "#00ff00", "seamB", 3);

  // stop here and I'll give more directions
  return { seamIndexA: idxA, seamIndexB: idxB };
}

// Find the index pair (idxA, idxB) of closest vertices between two polylines
function findClosestVertexPair(
  polyA: Polyline2,
  polyB: Polyline2
): { idxA: number; idxB: number; distance: number } {
  const nA = polyA.length / 2;
  const nB = polyB.length / 2;

  let bestIdxA = 0;
  let bestIdxB = 0;
  let bestDist = Infinity;

  for (let i = 0; i < nA; i++) {
    const ptA: Vec2 = [polyA[i * 2], polyA[i * 2 + 1]];
    for (let j = 0; j < nB; j++) {
      const ptB: Vec2 = [polyB[j * 2], polyB[j * 2 + 1]];
      const dist = vec2Distance(ptA, ptB);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdxA = i;
        bestIdxB = j;
      }
    }
  }

  return { idxA: bestIdxA, idxB: bestIdxB, distance: bestDist };
}
