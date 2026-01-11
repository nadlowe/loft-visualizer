import { Plane3, PlaneOverrides } from "../geom/geomTypes";
import {
  polyline2Eval,
  polyline2Shift,
  polyline2VertexParams,
} from "../geom/polyline2";
import { projectVec2ToPlane3 } from "../geom/project";
import { Section } from "../geom/section";
import { getLoftSubEntities } from "../geom/utils";
import { vec3Lerp } from "../geom/vec3";
import { Doc } from "../state/doc";
import { LoftId } from "../util/uid";

// Number of subdivisions for loft surfaces (both along polylines and across sections)
export const LOFT_SUBDIVISIONS = 3;

export function generateLoft(
  loftId: LoftId,
  doc: Doc,
  planeOverrides?: PlaneOverrides
): Section[] | null {
  const subEntities = getLoftSubEntities(loftId, doc, planeOverrides);
  if (!subEntities) return null;

  const { loftEntity, docPl1, docPl2, plane1, plane2 } = subEntities;

  const sections = generateLoftSections(
    docPl1.polyline,
    loftEntity.seamIndexA,
    plane1,
    docPl2.polyline,
    loftEntity.seamIndexB,
    plane2
  );

  if (!sections || sections.length === 0) return null;

  return subdivideSections(sections, LOFT_SUBDIVISIONS);
}

function generateLoftSections(
  polyline1: number[],
  seam1: number,
  plane1: Plane3,
  polyline2: number[],
  seam2: number,
  plane2: Plane3
): Section[] {
  // Guard against empty polylines
  if (polyline1.length < 2 || polyline2.length < 2) return [];

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
  if (lastIdxL >= 0) {
    pairs.push([
      paramsLeast[lastIdxL],
      paramsMost[mappedIndicesMost[lastIdxL]],
    ]);
  }

  // Deduplicate and sort pairs by the first parameter
  const uniquePairs: [number, number][] = [];
  pairs.sort((a, b) => a[0] - b[0]);
  for (const pair of pairs) {
    if (
      uniquePairs.length === 0 ||
      pair[0] > uniquePairs[uniquePairs.length - 1][0] + 1e-8
    ) {
      uniquePairs.push(pair);
    }
  }

  // 3. Evaluate polylines at each paired parameter and project to 3D
  const sections: Section[] = uniquePairs.map(([tL, tM]) => {
    const vL_2d = polyline2Eval(plLeast, tL);
    const vM_2d = polyline2Eval(plMost, tM);

    const vL_3d = projectVec2ToPlane3(vL_2d, planeLeast);
    const vM_3d = projectVec2ToPlane3(vM_2d, planeMost);

    return swapped ? [vM_3d, vL_3d] : [vL_3d, vM_3d];
  });

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
