/**
 * A polyline2 is a 2D array of vertices
 * [x1,y1,x2,y2,x3,y3...]
 */
export type Polyline2 = number[];

/**
 * A polygon is an array of polylines.
 * The polylines must be closed.
 * The first polyline is the outer boundary (ccw).
 * The subsequent polylines are the holes (cw).
 */
export type Polygon = Polyline2[];

/**
 * A vector is a 3D vector.
 */
export type Vector3 = [number, number, number];

/**
 * A plane is a 3D plane defined by an origin and a normal.
 */
export interface Plane3 {
    readonly origin: Vector3;
    readonly normal: Vector3;
}

export interface Face {
    readonly plane: Plane3;
    readonly polygon: Polygon;
}
