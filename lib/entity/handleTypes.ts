import { LoftId, PolylineId, WorkPlaneId } from "../util/uid";

export type EntityHandle = WorkPlaneHandle | PolylineHandle | LoftHandle;
export type SelectableHandle = EntityHandle | VertexHandle;
export type HandleHashType = "workplane" | "polyline" | "loft" | "vertex";

export interface VertexHandle {
  readonly type: "VERTEX";
  readonly polylineId: PolylineId;
  readonly vertexIndex: number;
}

export function vertexHandleToHash(handle: VertexHandle): string {
  return `polyline.${handle.polylineId}.${handle.vertexIndex}`;
}

export function hashToVertexHandle(hash: string): VertexHandle | undefined {
  const parts = hash.split(".");
  if (parts.length !== 3 || parts[0] !== "polyline") return undefined;
  const vertexIndex = parseInt(parts[2], 10);
  if (isNaN(vertexIndex)) return undefined;
  return {
    type: "VERTEX",
    polylineId: parts[1] as PolylineId,
    vertexIndex,
  };
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

export function handleToHash(handle: SelectableHandle): string {
  if (handle.type === "VERTEX") {
    return vertexHandleToHash(handle);
  }
  const typeMap: Record<EntityHandle["type"], HandleHashType> = {
    WORKPLANE: "workplane",
    POLYLINE: "polyline",
    LOFT: "loft",
  };
  return `${typeMap[handle.type]}.${handle.id}`;
}

export function hashToHandle(hash: string): SelectableHandle | undefined {
  const parts = hash.split(".");
  // Check for vertex handle (format: polyline.{id}.{vertexIndex})
  if (parts.length === 3 && parts[0] === "polyline") {
    const vertexHandle = hashToVertexHandle(hash);
    if (vertexHandle) return vertexHandle;
  }

  const [type, id] = parts;
  const handleType = type as HandleHashType;
  switch (handleType) {
    case "workplane":
      return { type: "WORKPLANE", id: id as WorkPlaneId };
    case "polyline":
      return { type: "POLYLINE", id: id as PolylineId };
    case "loft":
      return { type: "LOFT", id: id as LoftId };
  }
}
