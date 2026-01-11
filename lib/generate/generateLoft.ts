import { Plane3 } from "../geom/geomTypes";
import { worldPlaneXY } from "../geom/plane3";
import {
  polyline2Eval,
  polyline2Shift,
  polyline2VertexParams,
} from "../geom/polyline2";
import { projectVec2ToPlane3 } from "../geom/project";
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

  const sections = generateLoftSections(
    docPl1.polyline,
    loftEntity.seamIndexA,
    !!docPl1.closed,
    plane1,
    docPl2.polyline,
    loftEntity.seamIndexB,
    !!docPl2.closed,
    plane2
  );

  if (!sections) return null;

  return subdivideSections(sections, LOFT_SUBDIVISIONS);
}

function generateLoftSections(
  polyline1: number[],
  seam1: number,
  closed1: boolean,
  plane1: Plane3,
  polyline2: number[],
  seam2: number,
  closed2: boolean,
  plane2: Plane3
): Section[] {
  // Shift polylines so seams are at the start
  const pl1 = polyline2Shift(polyline1, seam1);
  const pl2 = polyline2Shift(polyline2, seam2);

  // Calculate normalized parameters for all vertices
  const params1 = polyline2VertexParams(pl1, 0);
  const params2 = polyline2VertexParams(pl2, 0);

  const n1 = params1.length;
  const n2 = params2.length;

  let plLeast: number[],
    plMost: number[],
    paramsLeast: number[],
    paramsMost: number[];
  let planeLeast: Plane3, planeMost: Plane3;
  let swapped = false;

  if (n1 <= n2) {
    plLeast = pl1;
    paramsLeast = params1;
    planeLeast = plane1;
    plMost = pl2;
    paramsMost = params2;
    planeMost = plane2;
  } else {
    plLeast = pl2;
    paramsLeast = params2;
    planeLeast = plane2;
    plMost = pl1;
    paramsMost = params1;
    planeMost = plane1;
    swapped = true;
  }

  // 1. Find the closest vertex on the complex polyline for each vertex on the simpler one
  const mappedIndicesMost: number[] = [];
  const pickedMost = new Set<number>();
  for (let i = 0; i < paramsLeast.length; i++) {
    const tL = paramsLeast[i];
    let bestIdx = 0;
    let minDiff = Infinity;
    for (let j = 0; j < paramsMost.length; j++) {
      const diff = Math.abs(paramsMost[j] - tL);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = j;
      }
    }
    mappedIndicesMost[i] = bestIdx;
    pickedMost.add(bestIdx);
  }

  // 2. Collate pairs [tLeast, tMost] by filling in gaps from the complex polyline
  const pairs: [number, number][] = [];
  for (let i = 0; i < paramsLeast.length - 1; i++) {
    const tL_start = paramsLeast[i];
    const tL_end = paramsLeast[i + 1];
    const idxM_start = mappedIndicesMost[i];
    const idxM_end = mappedIndicesMost[i + 1];
    const tM_start = paramsMost[idxM_start];
    const tM_end = paramsMost[idxM_end];

    // Add the anchor pair for the current vertex on the simpler polyline
    pairs.push([tL_start, tM_start]);

    // Identify and map skipped vertices from the complex polyline back to the simpler one
    if (idxM_start !== idxM_end) {
      const step = idxM_end > idxM_start ? 1 : -1;
      for (let j = idxM_start + step; j !== idxM_end; j += step) {
        if (pickedMost.has(j)) continue;

        const tM_skipped = paramsMost[j];
        // Relative position within the segment on the complex polyline
        const denom = tM_end - tM_start;
        const rel =
          Math.abs(denom) < 1e-10 ? 0 : (tM_skipped - tM_start) / denom;
        // Apply relative position to the segment on the simpler polyline (lerp)
        const tL_mapped = tL_start + rel * (tL_end - tL_start);
        pairs.push([tL_mapped, tM_skipped]);
      }
    }
  }
  // Add the final anchor pair
  const lastIdxL = paramsLeast.length - 1;
  pairs.push([paramsLeast[lastIdxL], paramsMost[mappedIndicesMost[lastIdxL]]]);

  console.log("pairs", pairs);

  // 3. Evaluate polylines at each paired parameter and project to 3D
  const sections: Section[] = [];
  for (const [tL, tM] of pairs) {
    const vL = polyline2Eval(plLeast, tL);
    const vM = polyline2Eval(plMost, tM);

    if (!swapped) {
      sections.push([
        projectVec2ToPlane3(vL, planeLeast),
        projectVec2ToPlane3(vM, planeMost),
      ]);
    } else {
      sections.push([
        projectVec2ToPlane3(vM, planeMost),
        projectVec2ToPlane3(vL, planeLeast),
      ]);
    }
  }

  return sections;
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
