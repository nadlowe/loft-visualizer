import { PolylineEntity } from "@/lib/entity/polylineEntity";
import { PolylineId, WorkPlaneId } from "@/lib/util/uid";
import { Table } from "@/lib/util/table";

const SNAP_THRESHOLD = 0.15;

export function snapToVertices(
  point: { x: number; y: number },
  workPlaneId: WorkPlaneId | undefined,
  polylines: Table<PolylineId, PolylineEntity>,
  excludePolylineId?: PolylineId,
  excludeVertexIndex?: number
): { snapped: boolean; point: { x: number; y: number } } {
  let closestDist = SNAP_THRESHOLD;
  let snappedPoint = point;
  let snapped = false;

  for (const [id, polyline] of Object.entries(polylines)) {
    // Only snap to polylines on the same work plane (or both without work plane)
    if (polyline.workPlaneId !== workPlaneId) continue;

    const vertexCount = Math.floor(polyline.polyline.length / 2);
    for (let i = 0; i < vertexCount; i++) {
      // Skip the excluded vertex
      if (id === excludePolylineId && i === excludeVertexIndex) continue;

      const vx = polyline.polyline[i * 2];
      const vy = polyline.polyline[i * 2 + 1];

      const dx = point.x - vx;
      const dy = point.y - vy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < closestDist) {
        closestDist = dist;
        snappedPoint = { x: vx, y: vy };
        snapped = true;
      }
    }
  }

  return { snapped, point: snappedPoint };
}
