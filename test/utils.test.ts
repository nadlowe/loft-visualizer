import { Doc } from "@/lib/doc/doc";
import { describe, expect, it } from "@jest/globals";
import { PolylineEntity } from "../lib/entity/polylineEntity";
import {
  adjustLoftSeamsAfterPolylineEdit,
  getPolylineUniqueVertexCount,
  mergePolylineVerticesWithIndices,
} from "../lib/geom/utils";
import { DocId, LoftId, PolylineId } from "../lib/util/uid";

describe("getPolylineUniqueCount", () => {
  it("returns total vertex count for open polylines", () => {
    const poly: PolylineEntity = {
      id: "p1" as PolylineId,
      type: "POLYLINE",
      name: "p1",
      polyline: [0, 0, 10, 0, 10, 10],
      closed: false,
    };
    expect(getPolylineUniqueVertexCount(poly)).toBe(3);
  });

  it("returns vertex count minus 1 for closed polylines", () => {
    const poly: PolylineEntity = {
      id: "p1" as PolylineId,
      type: "POLYLINE",
      name: "p1",
      polyline: [0, 0, 10, 0, 10, 10, 0, 0],
      closed: true,
    };
    expect(getPolylineUniqueVertexCount(poly)).toBe(3);
  });
});

describe("mergePolylineVerticesWithIndices", () => {
  it("identifies deleted indices correctly", () => {
    const poly = [0, 0, 1, 1, 1, 1, 2, 2];
    const { polyline, deletedIndices } = mergePolylineVerticesWithIndices(poly);
    expect(polyline).toEqual([0, 0, 1, 1, 2, 2]);
    expect(deletedIndices).toEqual([2]);
  });

  it("handles multiple merges", () => {
    const poly = [0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3];
    const { polyline, deletedIndices } = mergePolylineVerticesWithIndices(poly);
    expect(polyline).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(deletedIndices).toEqual([2, 4]);
  });
});

describe("adjustLoftSeamsAfterPolylineEdit", () => {
  const p1Id = "p1" as PolylineId;
  const p2Id = "p2" as PolylineId;
  const lId = "l1" as LoftId;

  const createDoc = (seamA: number, seamB: number): Doc => ({
    id: "doc1" as DocId,
    name: "doc",
    workPlanes: {},
    polylines: {
      [p1Id]: {
        id: p1Id,
        type: "POLYLINE",
        name: "p1",
        polyline: [0, 0, 1, 1, 2, 2],
        closed: false,
      },
      [p2Id]: {
        id: p2Id,
        type: "POLYLINE",
        name: "p2",
        polyline: [0, 0, 1, 1, 2, 2],
        closed: false,
      },
    },
    lofts: {
      [lId]: {
        id: lId,
        type: "LOFT",
        name: "l1",
        polyline1: p1Id,
        polyline2: p2Id,
        seamIndexA: seamA,
        seamIndexB: seamB,
      },
    },
  });

  it("increments seam if vertex is added before it", () => {
    const doc = createDoc(1, 1);
    const result = adjustLoftSeamsAfterPolylineEdit(doc, p1Id, {
      type: "ADD",
      index: 0,
    });
    expect(result[lId].seamIndexA).toBe(2);
    expect(result[lId].seamIndexB).toBe(1);
  });

  it("decrements seam if vertex is deleted before it", () => {
    const doc = createDoc(2, 1);
    const result = adjustLoftSeamsAfterPolylineEdit(doc, p1Id, {
      type: "DELETE",
      indices: [0],
    });
    expect(result[lId].seamIndexA).toBe(1);
  });

  it("handles seam vertex deletion by shifting other polyline's seam", () => {
    const doc = createDoc(1, 1);
    const result = adjustLoftSeamsAfterPolylineEdit(doc, p1Id, {
      type: "DELETE",
      indices: [1],
    });
    // SeamA stays 1 (now pointing to original index 2), seamB increments
    expect(result[lId].seamIndexA).toBe(1);
    expect(result[lId].seamIndexB).toBe(2);
  });
});
