import { v4 as uuidv4 } from "uuid";

export function uid<T extends string = EntityId>(): T {
  return uuidv4() as T;
}

export type EntityId = PolylineId | WorkPlaneId | LoftId;

export type WorkPlaneId = string & { readonly __brand: "WorkPlaneId" };
export type PolylineId = string & { readonly __brand: "PolylineId" };
export type LoftId = string & { readonly __brand: "LoftId" };
