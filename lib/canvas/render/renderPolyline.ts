import { colors } from "@/components/colors";
import { handleNew } from "@/lib/entity/handleTools/handleNew";
import { handleToHash } from "@/lib/entity/handleTools/handleTools";
import { EntityHandle } from "@/lib/entity/handleTypes";
import { PolylineEntity } from "@/lib/entity/polylineEntity";
import { Doc } from "@/lib/state/doc";
import { PolylineId, WorkPlaneId } from "@/lib/util/uid";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

// ─────────────────────────────────────────────────────────────────
// 1. PERSISTED DATA TYPES
//    Input: PolylineEntity with Polyline2
// ─────────────────────────────────────────────────────────────────

export interface RenderedPolyline {
  id: string;
  vertices: THREE.Vector3[];
  workPlaneId?: WorkPlaneId;
}

// ─────────────────────────────────────────────────────────────────
// 2. MANIPULATION GEOMETRY
//    Intermediate: THREE.Vector3[] for transforms/editing
// ─────────────────────────────────────────────────────────────────

function polylineToRendered(
  id: PolylineId,
  polylineEntity: PolylineEntity
): RenderedPolyline {
  const count = Math.floor(polylineEntity.polyline.length / 2);
  const vertices: THREE.Vector3[] = [];

  for (let i = 0; i < count; i++) {
    const x = polylineEntity.polyline[i * 2];
    const y = polylineEntity.polyline[i * 2 + 1];
    const vertex = new THREE.Vector3(x, y, 0);
    vertices.push(vertex);
  }

  if (polylineEntity.workPlaneId) {
    return {
      id,
      vertices,
      workPlaneId: polylineEntity.workPlaneId,
    };
  } else {
    return {
      id,
      vertices,
    };
  }
}

export function polylineTableToRendered(
  polylines: Doc["polylines"]
): RenderedPolyline[] {
  const result: RenderedPolyline[] = [];
  for (const [id, polylineEntity] of Object.entries(polylines)) {
    result.push(polylineToRendered(id as PolylineId, polylineEntity));
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────
// 3. RENDERABLE GEOMETRY
//    Output: LineGeometry → Line2 for GPU rendering
// ─────────────────────────────────────────────────────────────────

export function updatePolylineGeometry(
  polyline: RenderedPolyline,
  lineRefs: Map<string, LineGeometry>
): void {
  const positions: number[] = [];
  polyline.vertices.forEach((v) => {
    positions.push(v.x, v.y, v.z);
  });

  const existingGeometry = lineRefs.get(polyline.id);
  const existingVertexCount = existingGeometry
    ? (existingGeometry.attributes.instanceStart?.count ?? 0) + 1
    : 0;
  const newVertexCount = polyline.vertices.length;

  if (existingGeometry && existingVertexCount === newVertexCount) {
    existingGeometry.setPositions(positions);
  } else {
    if (existingGeometry) {
      existingGeometry.dispose();
    }
    const geometry = new LineGeometry();
    geometry.setPositions(positions);
    lineRefs.set(polyline.id, geometry);
  }
}

export function polylineToLine2(
  geometry: LineGeometry,
  handle: EntityHandle,
  size: { width: number; height: number },
  isSelected: (handle: ReturnType<typeof handleNew>) => boolean,
  pathPoints: THREE.Vector3[]
): Line2 {
  const selected = isSelected(handle);
  const color = selected ? colors.canvas.selected : colors.canvas.white;

  const material = new LineMaterial({
    color,
    linewidth: 1.5,
    resolution: new THREE.Vector2(size.width, size.height),
  });

  const line = new Line2(geometry, material);
  line.userData.handleHash = handleToHash(handle);
  line.userData.pathPoints = pathPoints;
  return line;
}
