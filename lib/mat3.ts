import { Vec2, Polyline2 } from "./geomTypes";

// Matrix3 type for 2D transformations (3x3 matrix stored as flat array)
// [a, b, tx, c, d, ty, 0, 0, 1] in row-major order
export type Mat3 = [
    number,
    number,
    number, // row 0: a, b, tx
    number,
    number,
    number, // row 1: c, d, ty
    number,
    number,
    number, // row 2: 0, 0, 1
];

/**
 * Creates an identity matrix
 */
export function mat3Identity(): Mat3 {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

/**
 * Creates a rotation matrix around the origin
 * @param angleRad Rotation angle in radians
 */
export function mat3Rotate(
    angleRad: number,
    originX: number = 0,
    originY: number = 0
): Mat3 {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return [
        cos,
        -sin,
        originX - originX * cos + originY * sin,
        sin,
        cos,
        originY - originX * sin - originY * cos,
        0,
        0,
        1,
    ];
}

/**
 * Creates a translation matrix
 * @param tx Translation in X direction
 * @param ty Translation in Y direction
 */
export function mat3Translate(tx: number, ty: number): Mat3 {
    return [1, 0, tx, 0, 1, ty, 0, 0, 1];
}

/**
 * Multiplies two matrices: result = a * b
 */
export function mat3Multiply(a: Mat3, b: Mat3): Mat3 {
    const a00 = a[0],
        a01 = a[1],
        a02 = a[2];
    const a10 = a[3],
        a11 = a[4],
        a12 = a[5];
    const a20 = a[6],
        a21 = a[7],
        a22 = a[8];

    const b00 = b[0],
        b01 = b[1],
        b02 = b[2];
    const b10 = b[3],
        b11 = b[4],
        b12 = b[5];
    const b20 = b[6],
        b21 = b[7],
        b22 = b[8];

    return [
        a00 * b00 + a01 * b10 + a02 * b20,
        a00 * b01 + a01 * b11 + a02 * b21,
        a00 * b02 + a01 * b12 + a02 * b22,
        a10 * b00 + a11 * b10 + a12 * b20,
        a10 * b01 + a11 * b11 + a12 * b21,
        a10 * b02 + a11 * b12 + a12 * b22,
        a20 * b00 + a21 * b10 + a22 * b20,
        a20 * b01 + a21 * b11 + a22 * b21,
        a20 * b02 + a21 * b12 + a22 * b22,
    ];
}
