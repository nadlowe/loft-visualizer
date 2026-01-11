import { debugPolyline3s, debugVec3 } from "../debug/debugGeom";
import { Plane3, Polyline2, Polyline3, Vec2 } from "./geomTypes";
import { normalFromVec3sOnNormalAxis, plane3FromNormal } from "./plane3";
import {
  polyline2Centroid,
  polyline2Reverse,
  polyline2Shift,
  polyline2SignedArea,
} from "./polyline2";
import {
  projectPolyline2ToPlane3,
  projectPolyline3ToPlane3,
  projectVec2ToPlane3,
} from "./project";
import { vec2Distance } from "./vec2";

export interface AlignedPolylines {
  guide: Polyline2;
  follower: Polyline2;
  guideIsA: boolean;
  followerReversed: boolean;
}

export function alignPolylines(
  pl2A: Polyline2,
  plane3A: Plane3,
  pl3A: Polyline3,
  pl2B: Polyline2,
  plane3B: Plane3,
  pl3B: Polyline3
): AlignedPolylines {
  const [xA, yA, zA] = projectVec2ToPlane3(polyline2Centroid(pl2A), plane3A);
  const [xB, yB, zB] = projectVec2ToPlane3(polyline2Centroid(pl2B), plane3B);

  debugVec3([xA, yA, zA], "#ff00ff", "vec3A");
  debugVec3([xB, yB, zB], "#00ff00", "vec3B");

  const normal = normalFromVec3sOnNormalAxis([xA, yA, zA], [xB, yB, zB]);
  const plane3 = plane3FromNormal([xA, yA, zA], normal);

  // Project both arrays to XY plane as Polyline2s (lose z-axis)
  let polyA = projectPolyline3ToPlane3(pl3A, plane3);
  let polyB = projectPolyline3ToPlane3(pl3B, plane3);

  const { pl3: debugA } = projectPolyline2ToPlane3(polyA, plane3);
  const { pl3: debugB } = projectPolyline2ToPlane3(polyB, plane3);

  debugPolyline3s([debugA, debugB], ["#ff00ff", "#00ff00"], ["polyA", "polyB"]);

  // Set the one with more vertices as the "guide"
  const guideIsA = polyA.length >= polyB.length;
  let guide = guideIsA ? polyA : polyB;
  let follower = guideIsA ? polyB : polyA;

  // Find the two closest points to create the start seam
  const { idxA, idxB } = findClosestVertexPair(guide, follower);

  // Check that their windings are matched (both CCW or both CW)
  const guideArea = polyline2SignedArea(guide);
  const followerArea = polyline2SignedArea(follower);
  const windingsMatch = guideArea * followerArea > 0;
  const followerReversed = !windingsMatch;

  // If windings don't match, reverse the follower to match
  if (followerReversed) {
    follower = polyline2Reverse(follower);
    // After reversing, recalculate the closest point index for follower
    const followerCount = follower.length / 2;
    // Reversing maps index i to (n - 1 - i)
    const newFollowerIdx = followerCount - 1 - idxB;
    // Shift so seam vertex is at index 0
    guide = polyline2Shift(guide, idxA);
    follower = polyline2Shift(follower, newFollowerIdx);
  } else {
    // Shift both so seam vertex is at index 0
    guide = polyline2Shift(guide, idxA);
    follower = polyline2Shift(follower, idxB);
  }

  // stop here and I'll give more directions
  return { guide, follower, guideIsA, followerReversed };
}

// Find the index pair (idxA, idxB) of closest vertices between two polylines
function findClosestVertexPair(
  polyA: Polyline2,
  polyB: Polyline2
): { idxA: number; idxB: number; distance: number } {
  const nA = polyA.length / 2;
  const nB = polyB.length / 2;

  let bestIdxA = 0;
  let bestIdxB = 0;
  let bestDist = Infinity;

  for (let i = 0; i < nA; i++) {
    const ptA: Vec2 = [polyA[i * 2], polyA[i * 2 + 1]];
    for (let j = 0; j < nB; j++) {
      const ptB: Vec2 = [polyB[j * 2], polyB[j * 2 + 1]];
      const dist = vec2Distance(ptA, ptB);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdxA = i;
        bestIdxB = j;
      }
    }
  }

  return { idxA: bestIdxA, idxB: bestIdxB, distance: bestDist };
}
