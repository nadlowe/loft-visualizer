import { Polygon, Polyline2, Vector2 } from "./geom";
import { Mat3, mat3Rotate, mat3Translate } from "./mat3";
import { DIST_EPSILON } from "./scalar";

/**
 * Shifts the vertices in a polyline2
 */
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
    const numVertices = isClosed
        ? polyline.length / 2 - 1
        : polyline.length / 2;

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

/**
 * Vector2
 */
export function vec2Transform(vec: Vector2, mat: Mat3): Vector2 {
    const [x, y] = vec;
    return [mat[0] * x + mat[1] * y + mat[2], mat[3] * x + mat[4] * y + mat[5]];
}

export function vec2Translate(
    vec: Vector2,
    translationX: number,
    translationY: number
): Vector2 {
    return [vec[0] + translationX, vec[1] + translationY];
}

export function vec2Rotate(
    vec: Vector2,
    angleRad: number,
    originX: number = 0,
    originY: number = 0
): Vector2 {
    const mat = mat3Rotate(angleRad, originX, originY);
    return vec2Transform(vec, mat);
}

/**
 * Polyline2
 */
export function polyline2Transform(polyline: Polyline2, mat: Mat3): Polyline2 {
    const result: Polyline2 = [];
    for (let i = 0; i < polyline.length; i += 2) {
        const [x, y] = vec2Transform([polyline[i], polyline[i + 1]], mat);
        result.push(x, y);
    }
    return result;
}

export function polyline2Translate(
    polyline: Polyline2,
    translationX: number,
    translationY: number
): Polyline2 {
    return polyline2Transform(
        polyline,
        mat3Translate(translationX, translationY)
    );
}

export function polyline2Rotate(
    polyline: Polyline2,
    angleRad: number,
    originX: number = 0,
    originY: number = 0
): Polyline2 {
    return polyline2Transform(polyline, mat3Rotate(angleRad, originX, originY));
}

/**
 * Polygon
 */
export function polygonTransform(polygon: Polygon, mat: Mat3): Polygon {
    const result: Polygon = [];
    for (let i = 0; i < polygon.length; i++) {
        result.push(polyline2Transform(polygon[i], mat));
    }
    return result;
}

export function polygonTranslate(
    polygon: Polygon,
    translationX: number,
    translationY: number
): Polygon {
    return polygonTransform(polygon, mat3Translate(translationX, translationY));
}

export function polygonRotate(
    polygon: Polygon,
    angleRad: number,
    originX: number,
    originY: number
): Polygon {
    return polygonTransform(polygon, mat3Rotate(angleRad, originX, originY));
}
