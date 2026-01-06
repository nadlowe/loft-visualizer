import { LoftId, PolylineId, WorkPlaneId } from "../util/uid";

export type EntityHandle = WorkPlaneHandle | PolylineHandle | LoftHandle;
export type HandleHashType = "workplane" | "polyline" | "loft";

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

export function handleToHash(handle: EntityHandle): string {
  const typeMap: Record<EntityHandle["type"], HandleHashType> = {
    WORKPLANE: "workplane",
    POLYLINE: "polyline",
    LOFT: "loft",
  };
  return `${typeMap[handle.type]}.${handle.id}`;
}

export function hashToHandle(hash: string): EntityHandle | undefined {
  const [type, id] = hash.split(".");
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
