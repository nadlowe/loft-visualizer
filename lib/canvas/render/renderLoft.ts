import { LoftEntity } from "@/lib/entity/loftEntity";
import { polyline2Shift } from "@/lib/geom/polyline2";
import { Doc } from "@/lib/state/doc";
import { useStore } from "@/lib/state/useStore";
import { LoftId, PolylineId, WorkPlaneId } from "@/lib/util/uid";
import * as THREE from "three";
import { generateLoft, LOFT_SUBDIVISIONS } from "../../conversion/generateLoft";

// ─────────────────────────────────────────────────────────────────
// 1. PERSISTED DATA TYPES
//    Input: LoftEntity with polyline references
// ─────────────────────────────────────────────────────────────────

export interface RenderedLoft {
  id: string;
  sections: THREE.Vector3[][];
  subdivisions: number;
}

// ─────────────────────────────────────────────────────────────────
// 2. MANIPULATION GEOMETRY
//    Intermediate: sections (Vector3[][]) for surface generation
// ─────────────────────────────────────────────────────────────────

function loftToRendered(
  id: LoftId,
  loftEntity: LoftEntity,
  workPlanes: Array<{ workPlane: THREE.Group; id: string }>,
  polylines: Doc["polylines"]
): RenderedLoft | null {
  const pl1 = polylines[loftEntity.polyline1];
  const pl2 = polylines[loftEntity.polyline2];
  if (!pl1 || !pl2) {
    return null;
  }

  const workPlane1 = pl1.workPlaneId
    ? workPlanes.find((wp) => wp.id === pl1.workPlaneId)?.workPlane
    : undefined;
  const workPlane2 = pl2.workPlaneId
    ? workPlanes.find((wp) => wp.id === pl2.workPlaneId)?.workPlane
    : undefined;

  const shiftedPolyline1 = polyline2Shift(
    pl1.polyline,
    loftEntity.polyline1Shift ?? 0
  );
  const shiftedPolyline2 = polyline2Shift(
    pl2.polyline,
    loftEntity.polyline2Shift ?? 0
  );

  const sections = generateLoft(
    shiftedPolyline1,
    shiftedPolyline2,
    workPlane1,
    workPlane2,
    LOFT_SUBDIVISIONS
  );

  return { id, sections, subdivisions: LOFT_SUBDIVISIONS };
}

export function loftTableToRendered(
  workPlanes: Array<{ workPlane: THREE.Group; id: string }>,
  polylines: Doc["polylines"],
  lofts: Doc["lofts"]
): RenderedLoft[] {
  const result: RenderedLoft[] = [];
  for (const [id, loftEntity] of Object.entries(lofts)) {
    const rendered = loftToRendered(
      id as LoftId,
      loftEntity,
      workPlanes,
      polylines
    );
    if (rendered) {
      result.push(rendered);
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────
// 3. RENDERABLE GEOMETRY
//    Output: BufferGeometry for mesh + wireframe rendering
// ─────────────────────────────────────────────────────────────────

export interface SubdividedSurface {
  surfacePositions: number[];
  surfaceIndices: number[];
  wireframeIndices: number[];
}

export function generateSubdividedSurface(
  sections: THREE.Vector3[][],
  sectionSubdivisions: number
): SubdividedSurface {
  const surfacePositions: number[] = [];
  const surfaceIndices: number[] = [];
  const wireframeIndices: number[] = [];

  const gridRows = sections.length;
  const gridCols = sectionSubdivisions + 2;

  for (let row = 0; row < gridRows; row++) {
    const section = sections[row];
    const p1 = section[0];
    const p2 = section[1];
    for (let col = 0; col < gridCols; col++) {
      const t = col / (gridCols - 1);
      const point = new THREE.Vector3().lerpVectors(p1, p2, t);
      surfacePositions.push(point.x, point.y, point.z);
    }
  }

  for (let row = 0; row < gridRows - 1; row++) {
    for (let col = 0; col < gridCols - 1; col++) {
      const v0 = row * gridCols + col;
      const v1 = (row + 1) * gridCols + col;
      const v2 = (row + 1) * gridCols + (col + 1);
      const v3 = row * gridCols + (col + 1);

      const p0 = new THREE.Vector3(
        surfacePositions[v0 * 3],
        surfacePositions[v0 * 3 + 1],
        surfacePositions[v0 * 3 + 2]
      );
      const p2Pos = new THREE.Vector3(
        surfacePositions[v2 * 3],
        surfacePositions[v2 * 3 + 1],
        surfacePositions[v2 * 3 + 2]
      );
      const p1Pos = new THREE.Vector3(
        surfacePositions[v1 * 3],
        surfacePositions[v1 * 3 + 1],
        surfacePositions[v1 * 3 + 2]
      );
      const p3Pos = new THREE.Vector3(
        surfacePositions[v3 * 3],
        surfacePositions[v3 * 3 + 1],
        surfacePositions[v3 * 3 + 2]
      );

      const d02 = p0.distanceToSquared(p2Pos);
      const d13 = p1Pos.distanceToSquared(p3Pos);

      if (d02 >= d13) {
        surfaceIndices.push(v0, v1, v2, v0, v2, v3);
      } else {
        surfaceIndices.push(v0, v1, v3, v1, v2, v3);
      }

      if (row === 0) wireframeIndices.push(v0, v3);
      if (col === 0) wireframeIndices.push(v0, v1);
      wireframeIndices.push(v1, v2);
      wireframeIndices.push(v3, v2);
    }
  }

  return { surfacePositions, surfaceIndices, wireframeIndices };
}

export function updateLoftGeometry(
  loft: RenderedLoft,
  loftRefs: Map<string, THREE.BufferGeometry>,
  loftSurfaceRefs: Map<string, THREE.BufferGeometry>,
  loftWireframeRefs: Map<string, THREE.BufferGeometry>
): void {
  const positions: number[] = [];
  const indices: number[] = [];
  let vertexIndex = 0;

  loft.sections.forEach((section) => {
    positions.push(section[0].x, section[0].y, section[0].z);
    positions.push(section[1].x, section[1].y, section[1].z);
    indices.push(vertexIndex, vertexIndex + 1);
    vertexIndex += 2;
  });

  const existingGeometry = loftRefs.get(loft.id);
  const newVertexCount = positions.length / 3;
  const existingVertexCount = existingGeometry
    ? (existingGeometry.attributes.position?.count ?? 0)
    : 0;

  if (existingGeometry && existingVertexCount === newVertexCount) {
    const posAttr = existingGeometry.attributes
      .position as THREE.BufferAttribute;
    posAttr.array.set(positions);
    posAttr.needsUpdate = true;
  } else {
    if (existingGeometry) {
      existingGeometry.dispose();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setIndex(indices);
    loftRefs.set(loft.id, geometry);
  }

  if (loft.sections.length >= 2) {
    const sectionSubdivisions = loft.subdivisions || LOFT_SUBDIVISIONS;
    const { surfacePositions, surfaceIndices, wireframeIndices } =
      generateSubdividedSurface(loft.sections, sectionSubdivisions);

    const existingSurfaceGeometry = loftSurfaceRefs.get(loft.id);
    const newSurfaceVertexCount = surfacePositions.length / 3;
    const existingSurfaceVertexCount = existingSurfaceGeometry
      ? (existingSurfaceGeometry.attributes.position?.count ?? 0)
      : 0;

    if (
      existingSurfaceGeometry &&
      existingSurfaceVertexCount === newSurfaceVertexCount
    ) {
      const posAttr = existingSurfaceGeometry.attributes
        .position as THREE.BufferAttribute;
      posAttr.array.set(surfacePositions);
      posAttr.needsUpdate = true;
      existingSurfaceGeometry.computeVertexNormals();
    } else {
      if (existingSurfaceGeometry) {
        existingSurfaceGeometry.dispose();
      }
      const surfaceGeometry = new THREE.BufferGeometry();
      surfaceGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(surfacePositions, 3)
      );
      surfaceGeometry.setIndex(surfaceIndices);
      surfaceGeometry.computeVertexNormals();
      loftSurfaceRefs.set(loft.id, surfaceGeometry);
    }

    const existingWireframeGeometry = loftWireframeRefs.get(loft.id);
    const existingWireframeVertexCount = existingWireframeGeometry
      ? (existingWireframeGeometry.attributes.position?.count ?? 0)
      : 0;

    if (
      existingWireframeGeometry &&
      existingWireframeVertexCount === newSurfaceVertexCount
    ) {
      const posAttr = existingWireframeGeometry.attributes
        .position as THREE.BufferAttribute;
      posAttr.array.set(surfacePositions);
      posAttr.needsUpdate = true;
    } else {
      if (existingWireframeGeometry) {
        existingWireframeGeometry.dispose();
      }
      const wireframeGeometry = new THREE.BufferGeometry();
      wireframeGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(surfacePositions, 3)
      );
      wireframeGeometry.setIndex(wireframeIndices);
      loftWireframeRefs.set(loft.id, wireframeGeometry);
    }
  }
}

export function updateLoftGeometryDuringDrag(
  loftId: string,
  loftEntity: {
    polyline1: PolylineId;
    polyline2: PolylineId;
    polyline1Shift?: number;
    polyline2Shift?: number;
  },
  workPlaneId: WorkPlaneId,
  currentWorkPlane: THREE.Group | undefined,
  workPlaneRefs: Map<string, THREE.Group>,
  loftRefs: Map<string, THREE.BufferGeometry>,
  loftSurfaceRefs: Map<string, THREE.BufferGeometry>,
  loftWireframeRefs: Map<string, THREE.BufferGeometry>
): void {
  const { doc } = useStore.getState();
  const polyline1 = doc.polylines[loftEntity.polyline1 as PolylineId];
  const polyline2 = doc.polylines[loftEntity.polyline2 as PolylineId];
  if (!polyline1 || !polyline2) return;

  const loftGeometry = loftRefs.get(loftId);
  if (!loftGeometry) return;

  const wp1 =
    polyline1.workPlaneId === workPlaneId
      ? currentWorkPlane
      : workPlaneRefs.get(polyline1.workPlaneId || "");
  const wp2 =
    polyline2.workPlaneId === workPlaneId
      ? currentWorkPlane
      : workPlaneRefs.get(polyline2.workPlaneId || "");

  if (wp1) wp1.updateMatrixWorld(true);
  if (wp2) wp2.updateMatrixWorld(true);

  const shiftedPolyline1 = polyline2Shift(
    polyline1.polyline,
    loftEntity.polyline1Shift ?? 0
  );
  const shiftedPolyline2 = polyline2Shift(
    polyline2.polyline,
    loftEntity.polyline2Shift ?? 0
  );

  const sections = generateLoft(
    shiftedPolyline1,
    shiftedPolyline2,
    wp1 || undefined,
    wp2 || undefined,
    LOFT_SUBDIVISIONS
  );

  const positions: number[] = [];
  const indices: number[] = [];
  let vertexIndex = 0;

  sections.forEach((section) => {
    positions.push(section[0].x, section[0].y, section[0].z);
    positions.push(section[1].x, section[1].y, section[1].z);
    indices.push(vertexIndex, vertexIndex + 1);
    vertexIndex += 2;
  });

  loftGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  loftGeometry.setIndex(indices);
  loftGeometry.attributes.position.needsUpdate = true;

  const surfaceGeometry = loftSurfaceRefs.get(loftId);
  const wireframeGeometry = loftWireframeRefs.get(loftId);
  if (surfaceGeometry && sections.length >= 2) {
    const { surfacePositions, surfaceIndices, wireframeIndices } =
      generateSubdividedSurface(sections, LOFT_SUBDIVISIONS);

    surfaceGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(surfacePositions, 3)
    );
    surfaceGeometry.setIndex(surfaceIndices);
    surfaceGeometry.attributes.position.needsUpdate = true;
    surfaceGeometry.computeVertexNormals();

    if (wireframeGeometry) {
      wireframeGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(surfacePositions, 3)
      );
      wireframeGeometry.setIndex(wireframeIndices);
      wireframeGeometry.attributes.position.needsUpdate = true;
    }
  }
}
