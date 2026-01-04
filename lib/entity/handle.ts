import { EntityId } from "../util/uid";
import { EntityType } from "./entityTypes";
import { EntityHandle } from "./handleTypes";

export function handleNew(type: EntityType, id: EntityId): EntityHandle {
  const typeMap = {
    POLYLINE: "polyline",
    WORKPLANE: "workplane",
    LOFT: "loft",
  } as const;
  return `${typeMap[type]}.${id}` as EntityHandle;
}
export function parseHandle(handle: EntityHandle): {
  type: EntityType;
  id: EntityId;
} {
  const [typeStr, ...idParts] = handle.split(".");
  const id = idParts.join(".") as EntityId;

  const typeMap = {
    polyline: "POLYLINE",
    workplane: "WORKPLANE",
    loft: "LOFT",
  } as const;

  const type = typeMap[typeStr as keyof typeof typeMap];
  if (!type) {
    throw new Error(`Invalid handle format: ${handle}`);
  }

  return { type, id };
}

export function getHandleType(handle: EntityHandle): EntityType {
  return parseHandle(handle).type;
}

export function getHandleId(handle: EntityHandle): EntityId {
  return parseHandle(handle).id;
}
