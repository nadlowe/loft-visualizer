import { EntityType } from "../entityTypes";

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
