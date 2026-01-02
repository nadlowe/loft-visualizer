import { Polyline2 } from "./geom";

/**
 * Shifts the vertices in a polyline2
 */
export function polyline2Shift(polyline: Polyline2, shift: number): Polyline2 {
    if (polyline.length < 2) return polyline;

    // Check if polyline is closed (first and last vertices are the same)
    const firstX = polyline[0];
    const firstY = polyline[1];
    const lastX = polyline[polyline.length - 2];
    const lastY = polyline[polyline.length - 1];
    const isClosed = firstX === lastX && firstY === lastY;

    if (isClosed) {
        // For closed polylines, the last vertex is a duplicate of the first
        // So we have one less unique vertex
        const numVertices = polyline.length / 2 - 1;

        // Handle edge case: single vertex (or empty after removing duplicate)
        if (numVertices <= 0) {
            return polyline;
        }

        // For closed polylines, handle negative shifts by converting to positive
        // using modulo arithmetic: -1 with 3 vertices = 2 (shift backwards by 1 = shift forwards by 2)
        // Adjust shift by -1 to account for the duplicate vertex in the array structure
        let shiftAmount = Math.floor(shift);
        // Convert to equivalent positive shift using proper modulo
        shiftAmount = ((shiftAmount % numVertices) + numVertices) % numVertices;

        const result: Polyline2 = [];
        const startIndex = shiftAmount * 2;

        // Copy from startIndex to end (excluding the closing vertex)
        for (let i = startIndex; i < polyline.length - 2; i++) {
            result.push(polyline[i]);
        }

        // Copy from beginning to startIndex
        for (let i = 0; i < startIndex; i++) {
            result.push(polyline[i]);
        }

        // Add the closing vertex (same as the new first vertex)
        result.push(result[0], result[1]);

        return result;
    } else {
        // For open polylines
        const numVertices = polyline.length / 2;
        const shiftAmount = Math.floor(shift);

        if (shiftAmount >= 0) {
            // Positive shift: remove first vertices (opening moves forward)
            const result: Polyline2 = [];
            const startIndex = shiftAmount * 2;

            for (let i = startIndex; i < polyline.length; i++) {
                result.push(polyline[i]);
            }

            return result;
        } else {
            // Negative shift: rotate backwards (last vertex moves to beginning)
            const result: Polyline2 = [];
            const absShift = Math.abs(shiftAmount);
            const startIndex = (numVertices - absShift) * 2;

            // Copy from startIndex to end
            for (let i = startIndex; i < polyline.length; i++) {
                result.push(polyline[i]);
            }

            // Copy from beginning to startIndex
            for (let i = 0; i < startIndex; i++) {
                result.push(polyline[i]);
            }

            return result;
        }
    }
}
