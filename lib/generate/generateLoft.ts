import { LoftEntity } from "../entity/loftEntity";
import { PolylineEntity } from "../entity/polylineEntity";
import { Plane3, Polyline2, Vec3 } from "../geom/geomTypes";
import { polyline2Reverse, polyline2Shift } from "../geom/polyline2";
import { Section } from "../geom/section";
import { computeDefaultU, vec3Cross, vec3Lerp } from "../geom/vec3";
import { Doc } from "../state/doc";
import { LoftId } from "../util/uid";

// Number of subdivisions for loft surfaces (both along polylines and across sections)
export const LOFT_SUBDIVISIONS = 3;

// this is used for responsiveness during drag operations
export interface PlaneOverrides {
  plane1?: Plane3;
  plane2?: Plane3;
}

export function generateLoft(
  loftId: LoftId,
  doc: Doc,
  planeOverrides?: PlaneOverrides
): Section[] | null {
  const loftEntity = doc.lofts[loftId];
  if (!loftEntity) return null;

  const docPl1 = doc.polylines[loftEntity.polyline1];
  const docPl2 = doc.polylines[loftEntity.polyline2];
  if (!docPl1 || !docPl2) return null;

  // Apply shift and reverse transformations
  const { pl1, pl2 } = mutatePolyline2s(loftEntity, docPl1, docPl2);

  // Use overrides if provided, otherwise look up from doc
  const plane1 =
    planeOverrides?.plane1 ??
    (docPl1.workPlaneId
      ? doc.workPlanes[docPl1.workPlaneId]?.plane3
      : undefined);
  const plane2 =
    planeOverrides?.plane2 ??
    (docPl2.workPlaneId
      ? doc.workPlanes[docPl2.workPlaneId]?.plane3
      : undefined);

  // If both polylines are closed, skip the duplicate closing vertex to avoid duplicate sections
  const bothClosed = docPl1.closed && docPl2.closed;
  const vertices1 = polylineToWorldVertices(pl1, plane1, bothClosed);
  const vertices2 = polylineToWorldVertices(pl2, plane2, bothClosed);

  // Create sections (pairs of corresponding vertices)
  const sections: Section[] = [];
  const maxCount = Math.max(vertices1.length, vertices2.length);
  const lastIdx1 = vertices1.length > 0 ? vertices1.length - 1 : 0;
  const lastIdx2 = vertices2.length > 0 ? vertices2.length - 1 : 0;

  for (let i = 0; i < maxCount; i++) {
    sections.push([
      vertices1[Math.min(i, lastIdx1)],
      vertices2[Math.min(i, lastIdx2)],
    ]);
  }

  // Close the loop by adding the first section again
  if (bothClosed && vertices1.length > 0 && vertices2.length > 0) {
    sections.push([vertices1[0], vertices2[0]]);
  }

  return subdivideSections(sections, LOFT_SUBDIVISIONS);
}

function mutatePolyline2s(
  loftEntity: LoftEntity,
  docPl1: PolylineEntity,
  docPl2: PolylineEntity
) {
  let pl1 = polyline2Shift(docPl1.polyline, loftEntity.polyline1Shift ?? 0);
  let pl2 = polyline2Shift(docPl2.polyline, loftEntity.polyline2Shift ?? 0);

  if (loftEntity.polyline1Reverse) {
    pl1 = polyline2Reverse(pl1);
  }
  if (loftEntity.polyline2Reverse) {
    pl2 = polyline2Reverse(pl2);
  }
  return { pl1, pl2 };
}

function polylineToWorldVertices(
  polyline: Polyline2,
  plane?: Plane3,
  skipClosingVertex?: boolean
): Vec3[] {
  const vertices: Vec3[] = [];
  // If skipClosingVertex is true, exclude the last vertex (which duplicates the first in closed polylines)
  const rawCount = Math.floor(polyline.length / 2);
  const count = skipClosingVertex ? rawCount - 1 : rawCount;

  if (!plane) {
    // No plane - points stay in XY plane at z=0
    for (let i = 0; i < count; i++) {
      vertices.push([polyline[i * 2], polyline[i * 2 + 1], 0]);
    }
    return vertices;
  }

  // Build transformation from plane basis vectors
  const { origin, normal } = plane;
  const u = plane.u ?? computeDefaultU(normal);
  const v = vec3Cross(normal, u); // Y-axis = normal × u

  for (let i = 0; i < count; i++) {
    const x = polyline[i * 2];
    const y = polyline[i * 2 + 1];

    // worldPos = origin + x * u + y * v
    vertices.push([
      origin[0] + x * u[0] + y * v[0],
      origin[1] + x * u[1] + y * v[1],
      origin[2] + x * u[2] + y * v[2],
    ]);
  }

  return vertices;
}

function subdivideSections(
  sections: Section[],
  subdivisions: number
): Section[] {
  if (sections.length < 2 || subdivisions < 1) return sections;

  const result: Section[] = [];
  for (let i = 0; i < sections.length - 1; i++) {
    result.push(sections[i]);
    const s1 = sections[i];
    const s2 = sections[i + 1];
    for (let j = 1; j <= subdivisions; j++) {
      const t = j / (subdivisions + 1);
      result.push([vec3Lerp(s1[0], s2[0], t), vec3Lerp(s1[1], s2[1], t)]);
    }
  }
  result.push(sections[sections.length - 1]);
  return result;
}
