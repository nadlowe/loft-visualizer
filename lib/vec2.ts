import { Vec2 } from "./geomTypes";
import { Mat3, mat3Rotate } from "./mat3";

/**
 * Vector2
 */

export function vec2Transform(vec: Vec2, mat: Mat3): Vec2 {
    const [x, y] = vec;
    return [mat[0] * x + mat[1] * y + mat[2], mat[3] * x + mat[4] * y + mat[5]];
}

export function vec2Translate(
    vec: Vec2,
    translationX: number,
    translationY: number
): Vec2 {
    return [vec[0] + translationX, vec[1] + translationY];
}

export function vec2Rotate(
    vec: Vec2,
    angleRad: number,
    originX: number = 0,
    originY: number = 0
): Vec2 {
    const mat = mat3Rotate(angleRad, originX, originY);
    return vec2Transform(vec, mat);
}
