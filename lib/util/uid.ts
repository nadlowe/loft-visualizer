import { nanoid } from "nanoid";

export function uid<T extends string = EntityId>(): T {
  return nanoid() as T;
}

export type DocId = string & { readonly __brand: "DocId" };

export type EntityId = PolylineId | WorkPlaneId | LoftId;

export type WorkPlaneId = string & { readonly __brand: "WorkPlaneId" };
export type PolylineId = string & { readonly __brand: "PolylineId" };
export type LoftId = string & { readonly __brand: "LoftId" };
