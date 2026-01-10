import { Polyline2 } from "./geomTypes";
import { DIST_EPSILON } from "./scalar";
import { vec2Distance } from "./vec2";

// Merges any interior vertices that are within epsilon of each other.
// Start and end vertices are always preserved.
export function polyline2MergeOverlappingVertices(
  polyline: Polyline2,
  epsilon: number = DIST_EPSILON
): Polyline2 {
  const numVertices = polyline.length / 2;

  // Need at least 3 vertices to have interior vertices to merge
  if (numVertices < 3) return [...polyline];

  const result: Polyline2 = [];

  // End vertex coords - always preserved, used for comparison
  const endX = polyline[polyline.length - 2];
  const endY = polyline[polyline.length - 1];

  // Always keep start vertex
  result.push(polyline[0], polyline[1]);

  // Process interior vertices (indices 1 to n-2)
  for (let i = 1; i < numVertices - 1; i++) {
    const x = polyline[i * 2];
    const y = polyline[i * 2 + 1];

    // Compare against last kept vertex
    const lastX = result[result.length - 2];
    const lastY = result[result.length - 1];
    const distToLast = vec2Distance([x, y], [lastX, lastY]);

    // Also compare against end vertex (which is always kept)
    const distToEnd = vec2Distance([x, y], [endX, endY]);

    // Keep only if far enough from both last kept AND end
    if (distToLast >= epsilon && distToEnd >= epsilon) {
      result.push(x, y);
    }
  }

  // Always keep end vertex
  result.push(endX, endY);

  return result;
}

export function polyline2Shift(
  polyline: Polyline2,
  shift: number,
  closedTolerance: number = DIST_EPSILON
): Polyline2 {
  if (polyline.length < 2) return polyline;

  // Check if polyline is closed (first and last vertices are the same)
  const firstX = polyline[0];
  const firstY = polyline[1];
  const lastX = polyline[polyline.length - 2];
  const lastY = polyline[polyline.length - 1];
  const isClosed =
    Math.abs(firstX - lastX) < closedTolerance &&
    Math.abs(firstY - lastY) < closedTolerance;

  // Calculate number of unique vertices
  const numVertices = isClosed ? polyline.length / 2 - 1 : polyline.length / 2;

  // Handle edge case: single vertex (or empty after removing duplicate)
  if (numVertices <= 0) {
    return polyline;
  }

  // Normalize shift amount using modulo
  let shiftAmount = Math.floor(shift) % numVertices;
  if (shiftAmount < 0) {
    shiftAmount += numVertices;
  }

  // Rotate the polyline
  const result: Polyline2 = [];
  const startIndex = shiftAmount * 2;
  const endIndex = isClosed ? polyline.length - 2 : polyline.length;

  // Copy from startIndex to end (excluding closing vertex for closed polylines)
  for (let i = startIndex; i < endIndex; i++) {
    result.push(polyline[i]);
  }

  // Copy from beginning to startIndex
  for (let i = 0; i < startIndex; i++) {
    result.push(polyline[i]);
  }

  // Add closing vertex for closed polylines (same as the new first vertex)
  if (isClosed) {
    result.push(result[0], result[1]);
  }

  return result;
}
