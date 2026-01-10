import { EntityId, LoftId, PolylineId, WorkPlaneId } from "../util/uid";
import { EntityType } from "./entityTypes";
import {
  EntityHandle,
  LoftHandle,
  PolylineHandle,
  WorkPlaneHandle,
} from "./handleTypes";

export function handleNew(type: "WORKPLANE", id: WorkPlaneId): WorkPlaneHandle;
export function handleNew(type: "POLYLINE", id: PolylineId): PolylineHandle;
export function handleNew(type: "LOFT", id: LoftId): LoftHandle;
export function handleNew(type: EntityType, id: EntityId): EntityHandle;
export function handleNew(type: EntityType, id: EntityId): EntityHandle {
  switch (type) {
    case "WORKPLANE":
      return { type: "WORKPLANE", id: id as WorkPlaneId };
    case "POLYLINE":
      return { type: "POLYLINE", id: id as PolylineId };
    case "LOFT":
      return { type: "LOFT", id: id as LoftId };
  }
}

export function parseHandle(handle: EntityHandle): {
  type: EntityType;
  id: EntityId;
} {
  return {
    type: handle.type,
    id: handle.id,
  };
}

export function getHandleType(handle: EntityHandle): EntityType {
  return handle.type;
}

export function getHandleId(handle: EntityHandle): EntityId {
  return handle.id;
}
