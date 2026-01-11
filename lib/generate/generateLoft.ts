import { LoftEntity } from "../entity/loftEntity";
import { PolylineEntity } from "../entity/polylineEntity";
import { Plane3 } from "../geom/geomTypes";
import { polyline2Reverse, polyline2Shift } from "../geom/polyline2";
import { projectPolyline2ToPlane3 } from "../geom/project";
import { Section } from "../geom/section";
import { vec3Lerp } from "../geom/vec3";
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
  const poly1 = projectPolyline2ToPlane3(pl1, plane1, bothClosed);
  const poly2 = projectPolyline2ToPlane3(pl2, plane2, bothClosed);

  // Create sections (pairs of corresponding vertices)
  const sections: Section[] = [];
  const count1 = poly1.length / 3;
  const count2 = poly2.length / 3;
  const maxCount = Math.max(count1, count2);
  const lastIdx1 = count1 > 0 ? count1 - 1 : 0;
  const lastIdx2 = count2 > 0 ? count2 - 1 : 0;

  for (let i = 0; i < maxCount; i++) {
    const idx1 = Math.min(i, lastIdx1) * 3;
    const idx2 = Math.min(i, lastIdx2) * 3;
    sections.push([
      [poly1[idx1], poly1[idx1 + 1], poly1[idx1 + 2]],
      [poly2[idx2], poly2[idx2 + 1], poly2[idx2 + 2]],
    ]);
  }

  // Close the loop by adding the first section again
  if (bothClosed && count1 > 0 && count2 > 0) {
    sections.push([
      [poly1[0], poly1[1], poly1[2]],
      [poly2[0], poly2[1], poly2[2]],
    ]);
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
