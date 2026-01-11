import { LoftEntity } from "../entity/loftEntity";
import { PolylineEntity } from "../entity/polylineEntity";
import { Doc } from "../state/doc";
import { LoftId, PolylineId } from "../util/uid";
import {
  Plane3,
  PlaneOverrides,
  Polyline2,
  Polyline3,
  Vec2,
} from "./geomTypes";
import {
  normalFromVec3sOnNormalAxis,
  plane3FromNormal,
  worldPlaneXY,
} from "./plane3";
import { polyline2Centroid } from "./polyline2";
import { projectPolyline3ToPlane3, projectVec2ToPlane3 } from "./project";
import { DIST_EPSILON } from "./scalar";
import { vec2Distance } from "./vec2";

export interface AlignedPolylines {
  seamIndexA: number;
  seamIndexB: number;
}

export function getPolylineUniqueCount(polyline: PolylineEntity): number {
  const rawCount = Math.floor(polyline.polyline.length / 2);
  return polyline.closed && rawCount > 0 ? rawCount - 1 : rawCount;
}

/**
 * Utility to merge overlapping vertices and return the deleted indices.
 * Keeps polyline2.ts logic-only.
 */
export function mergePolylineVerticesWithIndices(
  polyline: number[],
  epsilon: number = DIST_EPSILON
): { polyline: number[]; deletedIndices: number[] } {
  const numVertices = polyline.length / 2;
  if (numVertices < 3) return { polyline: [...polyline], deletedIndices: [] };

  const result: number[] = [];
  const deletedIndices: number[] = [];

  const endX = polyline[polyline.length - 2];
  const endY = polyline[polyline.length - 1];

  result.push(polyline[0], polyline[1]);

  for (let i = 1; i < numVertices - 1; i++) {
    const x = polyline[i * 2];
    const y = polyline[i * 2 + 1];

    const lastX = result[result.length - 2];
    const lastY = result[result.length - 1];
    const distToLast = vec2Distance([x, y], [lastX, lastY]);
    const distToEnd = vec2Distance([x, y], [endX, endY]);

    if (distToLast >= epsilon && distToEnd >= epsilon) {
      result.push(x, y);
    } else {
      deletedIndices.push(i);
    }
  }

  result.push(endX, endY);
  return { polyline: result, deletedIndices };
}

export function adjustLoftSeamsAfterPolylineEdit(
  doc: Doc,
  polylineId: PolylineId,
  edit: { type: "ADD"; index: number } | { type: "DELETE"; indices: number[] }
): Record<LoftId, LoftEntity> {
  const updatedLofts: Record<LoftId, LoftEntity> = { ...doc.lofts };

  for (const [loftId, loft] of Object.entries(doc.lofts)) {
    const isPoly1 = loft.polyline1 === polylineId;
    const isPoly2 = loft.polyline2 === polylineId;

    if (!isPoly1 && !isPoly2) continue;

    let seamA = loft.seamIndexA;
    let seamB = loft.seamIndexB;

    const polyEntity = doc.polylines[polylineId];
    if (!polyEntity) continue;

    const otherPolyId = isPoly1 ? loft.polyline2 : loft.polyline1;
    const otherPolyEntity = doc.polylines[otherPolyId];
    if (!otherPolyEntity) continue;

    const n = getPolylineUniqueCount(polyEntity);
    const nOther = getPolylineUniqueCount(otherPolyEntity);

    if (edit.type === "ADD") {
      const idx = isPoly1 ? seamA : seamB;
      // If adding a vertex before or at the seam, increment the seam
      if (edit.index <= idx) {
        if (isPoly1) seamA = (seamA + 1) % (n + 1);
        else seamB = (seamB + 1) % (n + 1);
      }
    } else {
      // Sort indices descending to process them from high to low
      // This ensures indices remain valid during the iteration
      const sortedIndices = [...edit.indices].sort((a, b) => b - a);
      let currentN = n;

      for (const delIdx of sortedIndices) {
        if (isPoly1) {
          if (delIdx < seamA) {
            seamA--;
          } else if (delIdx === seamA) {
            // Keep same index unless it was the last unique vertex
            if (seamA >= currentN - 1) {
              seamA = 0;
            }
            // Increment the non-deletion triggered polyline's seam
            seamB = (seamB + 1) % nOther;
          }
        } else {
          if (delIdx < seamB) {
            seamB--;
          } else if (delIdx === seamB) {
            if (seamB >= currentN - 1) {
              seamB = 0;
            }
            seamA = (seamA + 1) % nOther;
          }
        }
        currentN--;
      }
    }

    if (seamA !== loft.seamIndexA || seamB !== loft.seamIndexB) {
      updatedLofts[loftId as LoftId] = {
        ...loft,
        seamIndexA: seamA,
        seamIndexB: seamB,
      };
    }
  }

  return updatedLofts;
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

export interface LoftSubEntities {
  loftEntity: LoftEntity;
  docPl1: PolylineEntity;
  docPl2: PolylineEntity;
  plane1: Plane3;
  plane2: Plane3;
}

export function getPolylinePlane(polyline: PolylineEntity, doc: Doc): Plane3 {
  return polyline.workPlaneId
    ? (doc.workPlanes[polyline.workPlaneId]?.plane3 ?? worldPlaneXY())
    : worldPlaneXY();
}

export function getLoftSubEntities(
  loftId: LoftId,
  doc: Doc,
  planeOverrides?: PlaneOverrides
): LoftSubEntities | null {
  const loftEntity = doc.lofts[loftId];
  if (!loftEntity) return null;

  const docPl1 = doc.polylines[loftEntity.polyline1];
  const docPl2 = doc.polylines[loftEntity.polyline2];
  if (!docPl1 || !docPl2) return null;

  const plane1 = planeOverrides?.plane1 ?? getPolylinePlane(docPl1, doc);
  const plane2 = planeOverrides?.plane2 ?? getPolylinePlane(docPl2, doc);

  return { loftEntity, docPl1, docPl2, plane1, plane2 };
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
