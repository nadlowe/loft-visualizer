import { Doc } from "@/lib/doc/doc";
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

// Finds the next available name by incrementing the number suffix
export function nextAvailableName(doc: Doc, baseName: string): string {
  // Extract base name and number from names like "Loft 1" or "Work Plane 2"
  const match = baseName.match(/^(.+?)\s*(\d+)?$/);
  if (!match) return baseName;

  const prefix = match[1].trim();
  const startNum = match[2] ? parseInt(match[2], 10) : 1;

  // Collect all existing names across all entity types
  const existingNames = new Set<string>();
  for (const field of ["workPlanes", "polylines", "lofts"] as const) {
    for (const entity of Object.values(doc[field])) {
      existingNames.add(entity.name);
    }
  }

  // Find next available number
  let num = startNum + 1;
  while (existingNames.has(`${prefix} ${num}`)) {
    num++;
  }

  return `${prefix} ${num}`;
}
