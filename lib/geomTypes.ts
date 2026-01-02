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
 * A vector is a 2D vector.
 */
export type Vec2 = [number, number];

/**
 * A vector is a 3D vector.
 */
export type Vec3 = [number, number, number];

/**
 * A plane is a 3D plane defined by an origin, a normal, and an optional in-plane orientation vector.
 * The u vector defines the "forward" direction in the plane's local coordinate system.
 * If not provided, it will be computed from the normal when needed.
 */
export interface Plane3 {
    readonly origin: Vec3;
    readonly normal: Vec3;
    readonly u?: Vec3; // In-plane orientation vector (optional)
}

export interface Face {
    readonly plane: Plane3;
    readonly polygon: Polygon;
}
