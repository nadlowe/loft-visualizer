import { sectionsToThree } from "@/lib/conversion/geomToThree";
import { workPlaneToPlane3 } from "@/lib/conversion/threeToGeom";
import { generateLoft, LOFT_SUBDIVISIONS } from "@/lib/generate/generateLoft";
import { Doc } from "@/lib/state/doc";
import { useStore } from "@/lib/state/useStore";
import { LoftId, WorkPlaneId } from "@/lib/util/uid";
import * as THREE from "three";

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

function loftToRendered(loftId: LoftId, doc: Doc): RenderedLoft | null {
  const sections = generateLoft(loftId, doc);
  if (!sections) return null;

  return {
    id: loftId,
    sections: sectionsToThree(sections),
    subdivisions: LOFT_SUBDIVISIONS,
  };
}

export function loftTableToRendered(doc: Doc): RenderedLoft[] {
  const result: RenderedLoft[] = [];
  for (const loftId of Object.keys(doc.lofts)) {
    const rendered = loftToRendered(loftId as LoftId, doc);
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

function generateSubdividedSurface(
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
  loftId: LoftId,
  workPlaneId: WorkPlaneId,
  currentWorkPlane: THREE.Group | undefined,
  workPlaneRefs: Map<string, THREE.Group>,
  loftRefs: Map<string, THREE.BufferGeometry>,
  loftSurfaceRefs: Map<string, THREE.BufferGeometry>,
  loftWireframeRefs: Map<string, THREE.BufferGeometry>
): void {
  const { doc } = useStore.getState();

  const loftGeometry = loftRefs.get(loftId);
  if (!loftGeometry) return;

  const loftEntity = doc.lofts[loftId];
  if (!loftEntity) return;

  const polyline1 = doc.polylines[loftEntity.polyline1];
  const polyline2 = doc.polylines[loftEntity.polyline2];
  if (!polyline1 || !polyline2) return;

  // Get work planes from refs (which have current drag positions) and convert to Plane3
  const wp1Group =
    polyline1.workPlaneId === workPlaneId
      ? currentWorkPlane
      : workPlaneRefs.get(polyline1.workPlaneId || "");
  const wp2Group =
    polyline2.workPlaneId === workPlaneId
      ? currentWorkPlane
      : workPlaneRefs.get(polyline2.workPlaneId || "");

  const plane1 = wp1Group ? workPlaneToPlane3(wp1Group) : undefined;
  const plane2 = wp2Group ? workPlaneToPlane3(wp2Group) : undefined;

  const sections = generateLoft(loftId, doc, { plane1, plane2 });
  if (!sections) return;

  const positions: number[] = [];
  const indices: number[] = [];
  let vertexIndex = 0;

  sections.forEach((section) => {
    positions.push(...section[0], ...section[1]);
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
    const threeSections = sectionsToThree(sections);
    const { surfacePositions, surfaceIndices, wireframeIndices } =
      generateSubdividedSurface(threeSections, LOFT_SUBDIVISIONS);

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
