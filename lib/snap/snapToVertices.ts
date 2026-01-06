import * as THREE from "three";
import { Doc } from "../state/doc";
import { PolylineId, WorkPlaneId } from "../util/uid";

const SNAP_THRESHOLD = 0.15;

export interface SnapResult {
  snapped: boolean;
  point: { x: number; y: number };
  snapTarget?: {
    polylineId: PolylineId;
    vertexIndex: number;
  };
}

// Find nearest vertex from other polylines on the same work plane (or no work plane)
export function snapToVertices(
  point: { x: number; y: number },
  workPlaneId: WorkPlaneId | null | undefined,
  polylines: Doc["polylines"],
  excludePolylineId?: PolylineId,
  excludeVertexIndex?: number
): SnapResult {
  let bestDistance = SNAP_THRESHOLD;
  let bestPoint = point;
  let bestTarget: SnapResult["snapTarget"] = undefined;

  for (const [id, polylineEntity] of Object.entries(polylines)) {
    const polylineId = id as PolylineId;

    // Only snap to polylines on the same work plane (or both without work plane)
    // Treat null and undefined as equivalent (no work plane)
    const sameWorkPlane =
      (polylineEntity.workPlaneId ?? null) === (workPlaneId ?? null);
    if (!sameWorkPlane) continue;

    const vertexCount = Math.floor(polylineEntity.polyline.length / 2);
    for (let i = 0; i < vertexCount; i++) {
      // Skip excluded vertex (the one being dragged)
      if (polylineId === excludePolylineId && i === excludeVertexIndex) continue;

      const vx = polylineEntity.polyline[i * 2];
      const vy = polylineEntity.polyline[i * 2 + 1];

      const dist = Math.sqrt((point.x - vx) ** 2 + (point.y - vy) ** 2);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestPoint = { x: vx, y: vy };
        bestTarget = { polylineId, vertexIndex: i };
      }
    }
  }

  return {
    snapped: bestTarget !== undefined,
    point: bestPoint,
    snapTarget: bestTarget,
  };
}
