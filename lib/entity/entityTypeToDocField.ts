import { Doc } from "../state/doc";
import { EntityType } from "./entityTypes";

export const entityTypeToDocField: Record<EntityType, keyof Doc> = {
  WORKPLANE: "workPlanes",
  POLYLINE: "polylines",
  LOFT: "lofts",
};
