import { describe, it, expect } from "@jest/globals";
import { vec2Transform, vec2Translate, vec2Rotate } from "@/lib/vec2";
import { Vec2 } from "../lib/geomTypes";
import { mat3Identity, mat3Translate, mat3Rotate } from "../lib/mat3";

describe("vec2Transform", () => {
    it("transforms vector with identity matrix", () => {
        const vec: Vec2 = [1, 2];
        const mat = mat3Identity();
        const result = vec2Transform(vec, mat);
        expect(result).toEqual([1, 2]);
    });

    it("transforms vector with translation matrix", () => {
        const vec: Vec2 = [1, 2];
        const mat = mat3Translate(5, 10);
        const result = vec2Transform(vec, mat);
        expect(result).toEqual([6, 12]);
    });

    it("transforms vector with rotation matrix (90 degrees)", () => {
        const vec: Vec2 = [1, 0];
        const mat = mat3Rotate(Math.PI / 2);
        const result = vec2Transform(vec, mat);
        expect(result[0]).toBeCloseTo(0, 10);
        expect(result[1]).toBeCloseTo(1, 10);
    });

    it("transforms vector with rotation matrix (180 degrees)", () => {
        const vec: Vec2 = [1, 0];
        const mat = mat3Rotate(Math.PI);
        const result = vec2Transform(vec, mat);
        expect(result[0]).toBeCloseTo(-1, 10);
        expect(result[1]).toBeCloseTo(0, 10);
    });

    it("transforms vector with rotation matrix (270 degrees)", () => {
        const vec: Vec2 = [1, 0];
        const mat = mat3Rotate((3 * Math.PI) / 2);
        const result = vec2Transform(vec, mat);
        expect(result[0]).toBeCloseTo(0, 10);
        expect(result[1]).toBeCloseTo(-1, 10);
    });

    it("transforms vector with rotation matrix (45 degrees)", () => {
        const vec: Vec2 = [1, 0];
        const mat = mat3Rotate(Math.PI / 4);
        const result = vec2Transform(vec, mat);
        const expectedX = Math.cos(Math.PI / 4);
        const expectedY = Math.sin(Math.PI / 4);
        expect(result[0]).toBeCloseTo(expectedX, 10);
        expect(result[1]).toBeCloseTo(expectedY, 10);
    });

    it("transforms vector at origin", () => {
        const vec: Vec2 = [0, 0];
        const mat = mat3Translate(5, 10);
        const result = vec2Transform(vec, mat);
        expect(result).toEqual([5, 10]);
    });
});

describe("vec2Translate", () => {
    it("translates vector by positive amounts", () => {
        const vec: Vec2 = [1, 2];
        const result = vec2Translate(vec, 3, 4);
        expect(result).toEqual([4, 6]);
    });

    it("translates vector by negative amounts", () => {
        const vec: Vec2 = [5, 6];
        const result = vec2Translate(vec, -2, -3);
        expect(result).toEqual([3, 3]);
    });

    it("translates vector at origin", () => {
        const vec: Vec2 = [0, 0];
        const result = vec2Translate(vec, 10, 20);
        expect(result).toEqual([10, 20]);
    });

    it("translates vector by zero", () => {
        const vec: Vec2 = [1, 2];
        const result = vec2Translate(vec, 0, 0);
        expect(result).toEqual([1, 2]);
    });

    it("translates vector with mixed positive and negative", () => {
        const vec: Vec2 = [5, -3];
        const result = vec2Translate(vec, -2, 7);
        expect(result).toEqual([3, 4]);
    });
});

describe("vec2Rotate", () => {
    it("rotates vector around origin (90 degrees)", () => {
        const vec: Vec2 = [1, 0];
        const result = vec2Rotate(vec, Math.PI / 2);
        expect(result[0]).toBeCloseTo(0, 10);
        expect(result[1]).toBeCloseTo(1, 10);
    });

    it("rotates vector around origin (180 degrees)", () => {
        const vec: Vec2 = [1, 0];
        const result = vec2Rotate(vec, Math.PI);
        expect(result[0]).toBeCloseTo(-1, 10);
        expect(result[1]).toBeCloseTo(0, 10);
    });

    it("rotates vector around origin (360 degrees)", () => {
        const vec: Vec2 = [1, 2];
        const result = vec2Rotate(vec, 2 * Math.PI);
        expect(result[0]).toBeCloseTo(1, 10);
        expect(result[1]).toBeCloseTo(2, 10);
    });

    it("rotates vector around origin (45 degrees)", () => {
        const vec: Vec2 = [1, 0];
        const result = vec2Rotate(vec, Math.PI / 4);
        const expectedX = Math.cos(Math.PI / 4);
        const expectedY = Math.sin(Math.PI / 4);
        expect(result[0]).toBeCloseTo(expectedX, 10);
        expect(result[1]).toBeCloseTo(expectedY, 10);
    });

    it("rotates vector around custom origin", () => {
        const vec: Vec2 = [2, 0];
        const result = vec2Rotate(vec, Math.PI / 2, 1, 0);
        // Rotating [2,0] around [1,0] by 90 degrees should give [1,1]
        expect(result[0]).toBeCloseTo(1, 10);
        expect(result[1]).toBeCloseTo(1, 10);
    });

    it("rotates vector around custom origin (180 degrees)", () => {
        const vec: Vec2 = [3, 0];
        const result = vec2Rotate(vec, Math.PI, 1, 0);
        // Rotating [3,0] around [1,0] by 180 degrees should give [-1,0]
        expect(result[0]).toBeCloseTo(-1, 10);
        expect(result[1]).toBeCloseTo(0, 10);
    });

    it("rotates vector around origin at (0,0)", () => {
        const vec: Vec2 = [1, 1];
        const result = vec2Rotate(vec, Math.PI / 2, 0, 0);
        expect(result[0]).toBeCloseTo(-1, 10);
        expect(result[1]).toBeCloseTo(1, 10);
    });

    it("rotates vector around custom origin (2,2)", () => {
        const vec: Vec2 = [3, 2];
        const result = vec2Rotate(vec, Math.PI / 2, 2, 2);
        // Rotating [3,2] around [2,2] by 90 degrees should give [2,3]
        expect(result[0]).toBeCloseTo(2, 10);
        expect(result[1]).toBeCloseTo(3, 10);
    });

    it("rotates vector by zero radians", () => {
        const vec: Vec2 = [1, 2];
        const result = vec2Rotate(vec, 0);
        expect(result).toEqual([1, 2]);
    });

    it("rotates vector at origin point", () => {
        const vec: Vec2 = [0, 0];
        const result = vec2Rotate(vec, Math.PI / 2, 0, 0);
        expect(result).toEqual([0, 0]);
    });
});
