import { Doc } from "@/lib/state/doc";
import { EntityType } from "../entityTypes";
import { entityTypeToDocField } from "./entityTypeToDocField";

export const entityTypeToName = {
  singular: {
    WORKPLANE: "Work Plane",
    POLYLINE: "Polyline",
    LOFT: "Loft",
  } as Record<EntityType, string>,
  plural: {
    WORKPLANE: "Work Planes",
    POLYLINE: "Polylines",
    LOFT: "Lofts",
  } as Record<EntityType, string>,
};

export function entityName(doc: Doc, entityType: EntityType): string {
  const count = Object.keys(doc[entityTypeToDocField[entityType]]).length;
  return `${entityTypeToName.singular[entityType]} ${count + 1}`;
}
