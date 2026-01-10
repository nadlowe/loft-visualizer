import { LoftId, PolylineId, WorkPlaneId } from "../util/uid";

export type EntityHandle = WorkPlaneHandle | PolylineHandle | LoftHandle;
export type SelectableHandle = EntityHandle | VertexHandle;
export type HandleHashType = "workplane" | "polyline" | "loft" | "vertex";

export interface VertexHandle {
  readonly type: "VERTEX";
  readonly polylineId: PolylineId;
  readonly vertexIndex: number;
}

export interface WorkPlaneHandle {
  readonly type: "WORKPLANE";
  readonly id: WorkPlaneId;
}

export interface PolylineHandle {
  readonly type: "POLYLINE";
  readonly id: PolylineId;
}

export interface LoftHandle {
  readonly type: "LOFT";
  readonly id: LoftId;
}
