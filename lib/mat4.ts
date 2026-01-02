import { Vec3 } from "./geomTypes";

// Matrix4 type for 3D transformations (4x4 matrix stored as flat array)
// Stored in column-major order (like OpenGL/WebGL)
// [m00, m10, m20, m30, m01, m11, m21, m31, m02, m12, m22, m32, m03, m13, m23, m33]
// Or equivalently in row-major order:
// [m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33]
// We'll use row-major for consistency with Mat3
export type Mat4 = [
    number,
    number,
    number,
    number, // row 0
    number,
    number,
    number,
    number, // row 1
    number,
    number,
    number,
    number, // row 2
    number,
    number,
    number,
    number, // row 3
];

/**
 * Creates an identity matrix
 */
export function mat4Identity(): Mat4 {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

/**
 * Creates a translation matrix
 */
export function mat4Translate(tx: number, ty: number, tz: number): Mat4 {
    return [1, 0, 0, tx, 0, 1, 0, ty, 0, 0, 1, tz, 0, 0, 0, 1];
}

/**
 * Creates a rotation matrix around an arbitrary axis using Rodrigues' rotation formula
 * @param axis - The rotation axis direction (will be normalized)
 * @param angleRad - Rotation angle in radians
 */
export function mat4RotateAxis(axis: Vec3, angleRad: number): Mat4 {
    // Normalize axis
    const len = Math.sqrt(
        axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2]
    );
    if (len < 1e-10) {
        return mat4Identity(); // Invalid axis, return identity
    }
    const nx = axis[0] / len;
    const ny = axis[1] / len;
    const nz = axis[2] / len;

    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const oneMinusCos = 1 - cos;

    // Rodrigues' rotation formula
    // R = cos(θ)I + sin(θ)[n]× + (1-cos(θ))n⊗n
    // where [n]× is the cross product matrix and n⊗n is the outer product
    return [
        cos + nx * nx * oneMinusCos,
        nx * ny * oneMinusCos - nz * sin,
        nx * nz * oneMinusCos + ny * sin,
        0,
        ny * nx * oneMinusCos + nz * sin,
        cos + ny * ny * oneMinusCos,
        ny * nz * oneMinusCos - nx * sin,
        0,
        nz * nx * oneMinusCos - ny * sin,
        nz * ny * oneMinusCos + nx * sin,
        cos + nz * nz * oneMinusCos,
        0,
        0,
        0,
        0,
        1,
    ];
}

/**
 * Multiplies two matrices: result = a * b
 */
export function mat4Multiply(a: Mat4, b: Mat4): Mat4 {
    const a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3];
    const a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];
    const a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];
    const a30 = a[12],
        a31 = a[13],
        a32 = a[14],
        a33 = a[15];

    const b00 = b[0],
        b01 = b[1],
        b02 = b[2],
        b03 = b[3];
    const b10 = b[4],
        b11 = b[5],
        b12 = b[6],
        b13 = b[7];
    const b20 = b[8],
        b21 = b[9],
        b22 = b[10],
        b23 = b[11];
    const b30 = b[12],
        b31 = b[13],
        b32 = b[14],
        b33 = b[15];

    return [
        a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30,
        a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31,
        a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32,
        a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33,
        a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30,
        a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31,
        a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32,
        a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33,
        a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30,
        a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31,
        a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32,
        a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33,
        a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30,
        a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31,
        a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32,
        a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33,
    ];
}
