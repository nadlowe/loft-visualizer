import { describe, it, expect } from "@jest/globals";
import {
    polygonTransform,
    polygonTranslate,
    polygonRotate,
} from "@/lib/polygon";
import { Polygon } from "../lib/geomTypes";
import { mat3Identity, mat3Translate, mat3Rotate } from "../lib/mat3";

describe("polygonTransform", () => {
    it("transforms polygon with identity matrix", () => {
        const polygon: Polygon = [
            [0, 0, 1, 0, 1, 1, 0, 1, 0, 0], // outer boundary (closed)
        ];
        const mat = mat3Identity();
        const result = polygonTransform(polygon, mat);
        expect(result).toEqual([[0, 0, 1, 0, 1, 1, 0, 1, 0, 0]]);
    });

    it("transforms polygon with translation matrix", () => {
        const polygon: Polygon = [
            [0, 0, 1, 0, 1, 1, 0, 1, 0, 0], // outer boundary
        ];
        const mat = mat3Translate(5, 10);
        const result = polygonTransform(polygon, mat);
        expect(result).toEqual([[5, 10, 6, 10, 6, 11, 5, 11, 5, 10]]);
    });

    it("transforms polygon with rotation matrix (90 degrees)", () => {
        const polygon: Polygon = [
            [1, 0, 2, 0, 2, 1, 1, 1, 1, 0], // outer boundary
        ];
        const mat = mat3Rotate(Math.PI / 2);
        const result = polygonTransform(polygon, mat);
        expect(result[0][0]).toBeCloseTo(0, 10);
        expect(result[0][1]).toBeCloseTo(1, 10);
        expect(result[0][2]).toBeCloseTo(0, 10);
        expect(result[0][3]).toBeCloseTo(2, 10);
        expect(result[0][4]).toBeCloseTo(-1, 10);
        expect(result[0][5]).toBeCloseTo(2, 10);
        expect(result[0][6]).toBeCloseTo(-1, 10);
        expect(result[0][7]).toBeCloseTo(1, 10);
        expect(result[0][8]).toBeCloseTo(0, 10);
        expect(result[0][9]).toBeCloseTo(1, 10);
    });

    it("transforms polygon with multiple polylines (outer + hole)", () => {
        const polygon: Polygon = [
            [0, 0, 3, 0, 3, 3, 0, 3, 0, 0], // outer boundary
            [1, 1, 2, 1, 2, 2, 1, 2, 1, 1], // hole
        ];
        const mat = mat3Translate(10, 20);
        const result = polygonTransform(polygon, mat);
        expect(result).toEqual([
            [10, 20, 13, 20, 13, 23, 10, 23, 10, 20], // outer boundary
            [11, 21, 12, 21, 12, 22, 11, 22, 11, 21], // hole
        ]);
    });

    it("transforms empty polygon", () => {
        const polygon: Polygon = [];
        const mat = mat3Translate(5, 10);
        const result = polygonTransform(polygon, mat);
        expect(result).toEqual([]);
    });

    it("transforms polygon with single vertex polyline", () => {
        const polygon: Polygon = [[1, 1, 1, 1]]; // closed single vertex
        const mat = mat3Translate(5, 10);
        const result = polygonTransform(polygon, mat);
        expect(result).toEqual([[6, 11, 6, 11]]);
    });

    it("transforms polygon with rotation matrix (180 degrees)", () => {
        const polygon: Polygon = [
            [1, 0, 2, 0, 2, 1, 1, 1, 1, 0], // outer boundary
        ];
        const mat = mat3Rotate(Math.PI);
        const result = polygonTransform(polygon, mat);
        expect(result[0][0]).toBeCloseTo(-1, 10);
        expect(result[0][1]).toBeCloseTo(0, 10);
        expect(result[0][2]).toBeCloseTo(-2, 10);
        expect(result[0][3]).toBeCloseTo(0, 10);
        expect(result[0][4]).toBeCloseTo(-2, 10);
        expect(result[0][5]).toBeCloseTo(-1, 10);
        expect(result[0][6]).toBeCloseTo(-1, 10);
        expect(result[0][7]).toBeCloseTo(-1, 10);
    });
});

describe("polygonTranslate", () => {
    it("translates polygon by positive amounts", () => {
        const polygon: Polygon = [
            [0, 0, 1, 0, 1, 1, 0, 1, 0, 0], // outer boundary
        ];
        const result = polygonTranslate(polygon, 5, 10);
        expect(result).toEqual([[5, 10, 6, 10, 6, 11, 5, 11, 5, 10]]);
    });

    it("translates polygon by negative amounts", () => {
        const polygon: Polygon = [
            [5, 6, 7, 6, 7, 8, 5, 8, 5, 6], // outer boundary
        ];
        const result = polygonTranslate(polygon, -2, -3);
        expect(result).toEqual([[3, 3, 5, 3, 5, 5, 3, 5, 3, 3]]);
    });

    it("translates polygon by zero", () => {
        const polygon: Polygon = [
            [0, 0, 1, 0, 1, 1, 0, 1, 0, 0], // outer boundary
        ];
        const result = polygonTranslate(polygon, 0, 0);
        expect(result).toEqual([[0, 0, 1, 0, 1, 1, 0, 1, 0, 0]]);
    });

    it("translates empty polygon", () => {
        const polygon: Polygon = [];
        const result = polygonTranslate(polygon, 5, 10);
        expect(result).toEqual([]);
    });

    it("translates polygon with multiple polylines (outer + holes)", () => {
        const polygon: Polygon = [
            [0, 0, 4, 0, 4, 4, 0, 4, 0, 0], // outer boundary
            [1, 1, 2, 1, 2, 2, 1, 2, 1, 1], // hole 1
            [2, 2, 3, 2, 3, 3, 2, 3, 2, 2], // hole 2
        ];
        const result = polygonTranslate(polygon, 10, 20);
        expect(result).toEqual([
            [10, 20, 14, 20, 14, 24, 10, 24, 10, 20], // outer boundary
            [11, 21, 12, 21, 12, 22, 11, 22, 11, 21], // hole 1
            [12, 22, 13, 22, 13, 23, 12, 23, 12, 22], // hole 2
        ]);
    });

    it("translates polygon with single vertex polyline", () => {
        const polygon: Polygon = [[1, 1, 1, 1]]; // closed single vertex
        const result = polygonTranslate(polygon, 10, 20);
        expect(result).toEqual([[11, 21, 11, 21]]);
    });

    it("translates polygon at origin", () => {
        const polygon: Polygon = [
            [0, 0, 1, 0, 0, 1, 0, 0], // outer boundary
        ];
        const result = polygonTranslate(polygon, 5, 10);
        expect(result).toEqual([[5, 10, 6, 10, 5, 11, 5, 10]]);
    });
});

describe("polygonRotate", () => {
    it("rotates polygon around origin (90 degrees)", () => {
        const polygon: Polygon = [
            [1, 0, 2, 0, 2, 1, 1, 1, 1, 0], // outer boundary
        ];
        const result = polygonRotate(polygon, Math.PI / 2, 0, 0);
        expect(result[0][0]).toBeCloseTo(0, 10);
        expect(result[0][1]).toBeCloseTo(1, 10);
        expect(result[0][2]).toBeCloseTo(0, 10);
        expect(result[0][3]).toBeCloseTo(2, 10);
        expect(result[0][4]).toBeCloseTo(-1, 10);
        expect(result[0][5]).toBeCloseTo(2, 10);
        expect(result[0][6]).toBeCloseTo(-1, 10);
        expect(result[0][7]).toBeCloseTo(1, 10);
    });

    it("rotates polygon around origin (180 degrees)", () => {
        const polygon: Polygon = [
            [1, 0, 2, 0, 2, 1, 1, 1, 1, 0], // outer boundary
        ];
        const result = polygonRotate(polygon, Math.PI, 0, 0);
        expect(result[0][0]).toBeCloseTo(-1, 10);
        expect(result[0][1]).toBeCloseTo(0, 10);
        expect(result[0][2]).toBeCloseTo(-2, 10);
        expect(result[0][3]).toBeCloseTo(0, 10);
        expect(result[0][4]).toBeCloseTo(-2, 10);
        expect(result[0][5]).toBeCloseTo(-1, 10);
        expect(result[0][6]).toBeCloseTo(-1, 10);
        expect(result[0][7]).toBeCloseTo(-1, 10);
    });

    it("rotates polygon around origin (360 degrees)", () => {
        const polygon: Polygon = [
            [1, 2, 3, 2, 3, 4, 1, 4, 1, 2], // outer boundary
        ];
        const result = polygonRotate(polygon, 2 * Math.PI, 0, 0);
        expect(result[0][0]).toBeCloseTo(1, 10);
        expect(result[0][1]).toBeCloseTo(2, 10);
        expect(result[0][2]).toBeCloseTo(3, 10);
        expect(result[0][3]).toBeCloseTo(2, 10);
        expect(result[0][4]).toBeCloseTo(3, 10);
        expect(result[0][5]).toBeCloseTo(4, 10);
        expect(result[0][6]).toBeCloseTo(1, 10);
        expect(result[0][7]).toBeCloseTo(4, 10);
    });

    it("rotates polygon around custom origin", () => {
        const polygon: Polygon = [
            [2, 0, 3, 0, 3, 1, 2, 1, 2, 0], // outer boundary
        ];
        const result = polygonRotate(polygon, Math.PI / 2, 1, 0);
        // Rotating around [1,0] by 90 degrees
        expect(result[0][0]).toBeCloseTo(1, 10);
        expect(result[0][1]).toBeCloseTo(1, 10);
        expect(result[0][2]).toBeCloseTo(1, 10);
        expect(result[0][3]).toBeCloseTo(2, 10);
        expect(result[0][4]).toBeCloseTo(0, 10);
        expect(result[0][5]).toBeCloseTo(2, 10);
        expect(result[0][6]).toBeCloseTo(0, 10);
        expect(result[0][7]).toBeCloseTo(1, 10);
    });

    it("rotates polygon around custom origin (180 degrees)", () => {
        const polygon: Polygon = [
            [3, 0, 4, 0, 4, 1, 3, 1, 3, 0], // outer boundary
        ];
        const result = polygonRotate(polygon, Math.PI, 1, 0);
        // Rotating around [1,0] by 180 degrees
        expect(result[0][0]).toBeCloseTo(-1, 10);
        expect(result[0][1]).toBeCloseTo(0, 10);
        expect(result[0][2]).toBeCloseTo(-2, 10);
        expect(result[0][3]).toBeCloseTo(0, 10);
        expect(result[0][4]).toBeCloseTo(-2, 10);
        expect(result[0][5]).toBeCloseTo(-1, 10);
        expect(result[0][6]).toBeCloseTo(-1, 10);
        expect(result[0][7]).toBeCloseTo(-1, 10);
    });

    it("rotates polygon around custom origin (2,2)", () => {
        const polygon: Polygon = [
            [3, 2, 4, 2, 4, 3, 3, 3, 3, 2], // outer boundary
        ];
        const result = polygonRotate(polygon, Math.PI / 2, 2, 2);
        // Rotating around [2,2] by 90 degrees
        expect(result[0][0]).toBeCloseTo(2, 10);
        expect(result[0][1]).toBeCloseTo(3, 10);
        expect(result[0][2]).toBeCloseTo(2, 10);
        expect(result[0][3]).toBeCloseTo(4, 10);
        expect(result[0][4]).toBeCloseTo(1, 10);
        expect(result[0][5]).toBeCloseTo(4, 10);
        expect(result[0][6]).toBeCloseTo(1, 10);
        expect(result[0][7]).toBeCloseTo(3, 10);
    });

    it("rotates polygon by zero radians", () => {
        const polygon: Polygon = [
            [1, 2, 3, 2, 3, 4, 1, 4, 1, 2], // outer boundary
        ];
        const result = polygonRotate(polygon, 0, 0, 0);
        expect(result).toEqual([[1, 2, 3, 2, 3, 4, 1, 4, 1, 2]]);
    });

    it("rotates empty polygon", () => {
        const polygon: Polygon = [];
        const result = polygonRotate(polygon, Math.PI / 2, 0, 0);
        expect(result).toEqual([]);
    });

    it("rotates polygon with multiple polylines (outer + holes)", () => {
        const polygon: Polygon = [
            [0, 0, 4, 0, 4, 4, 0, 4, 0, 0], // outer boundary
            [1, 1, 2, 1, 2, 2, 1, 2, 1, 1], // hole
        ];
        const result = polygonRotate(polygon, Math.PI / 2, 0, 0);
        // Rotating both outer boundary and hole by 90 degrees around origin
        expect(result[0][0]).toBeCloseTo(0, 5);
        expect(result[0][1]).toBeCloseTo(0, 5);
        expect(result[0][2]).toBeCloseTo(0, 5);
        expect(result[0][3]).toBeCloseTo(4, 5);
        expect(result[0][4]).toBeCloseTo(-4, 5);
        expect(result[0][5]).toBeCloseTo(4, 5);
        expect(result[0][6]).toBeCloseTo(-4, 5);
        expect(result[0][7]).toBeCloseTo(0, 5);

        expect(result[1][0]).toBeCloseTo(-1, 5);
        expect(result[1][1]).toBeCloseTo(1, 5);
        expect(result[1][2]).toBeCloseTo(-1, 5);
        expect(result[1][3]).toBeCloseTo(2, 5);
        expect(result[1][4]).toBeCloseTo(-2, 5);
        expect(result[1][5]).toBeCloseTo(2, 5);
        expect(result[1][6]).toBeCloseTo(-2, 5);
        expect(result[1][7]).toBeCloseTo(1, 5);
    });

    it("rotates polygon with single vertex polyline", () => {
        const polygon: Polygon = [[1, 0, 1, 0]]; // closed single vertex
        const result = polygonRotate(polygon, Math.PI / 2, 0, 0);
        expect(result[0][0]).toBeCloseTo(0, 10);
        expect(result[0][1]).toBeCloseTo(1, 10);
    });
});
