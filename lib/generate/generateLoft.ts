import { Plane3 } from "../geom/geomTypes";
import { worldPlaneXY } from "../geom/plane3";
import { polyline2Shift } from "../geom/polyline2";
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

  // Shift polylines to start at seam indices
  const pl1 = polyline2Shift(docPl1.polyline, loftEntity.seamIndexA);
  const pl2 = polyline2Shift(docPl2.polyline, loftEntity.seamIndexB);

  // Use overrides if provided, otherwise look up from doc
  const plane1 =
    planeOverrides?.plane1 ??
    (docPl1.workPlaneId
      ? doc.workPlanes[docPl1.workPlaneId]?.plane3
      : worldPlaneXY());
  const plane2 =
    planeOverrides?.plane2 ??
    (docPl2.workPlaneId
      ? doc.workPlanes[docPl2.workPlaneId]?.plane3
      : worldPlaneXY());

  // Skip the duplicate closing vertex if a polyline is closed to avoid duplicate sections
  const { pl3: pl3A } = projectPolyline2ToPlane3(pl1, plane1, docPl1.closed);
  const { pl3: pl3B } = projectPolyline2ToPlane3(pl2, plane2, docPl2.closed);

  // If both polylines are closed, we'll manually add the closing section later
  const bothClosed = docPl1.closed && docPl2.closed;

  // Create sections (pairs of corresponding vertices)
  const sections: Section[] = [];
  const count1 = pl3A.length / 3;
  const count2 = pl3B.length / 3;
  const maxCount = Math.max(count1, count2);
  const lastIdx1 = count1 > 0 ? count1 - 1 : 0;
  const lastIdx2 = count2 > 0 ? count2 - 1 : 0;

  for (let i = 0; i < maxCount; i++) {
    const idx1 = Math.min(i, lastIdx1) * 3;
    const idx2 = Math.min(i, lastIdx2) * 3;
    sections.push([
      [pl3A[idx1], pl3A[idx1 + 1], pl3A[idx1 + 2]],
      [pl3B[idx2], pl3B[idx2 + 1], pl3B[idx2 + 2]],
    ]);
  }

  // Close the loop by adding the first section again
  if (bothClosed && count1 > 0 && count2 > 0) {
    sections.push([
      [pl3A[0], pl3A[1], pl3A[2]],
      [pl3B[0], pl3B[1], pl3B[2]],
    ]);
  }

  return subdivideSections(sections, LOFT_SUBDIVISIONS);
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
