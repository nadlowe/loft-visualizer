import { Polyline2 } from "../geom/geomTypes";
import { Doc } from "../state/doc";
import { LoftId, PolylineId, uid } from "../util/uid";
import { entityTypeToDocField } from "./entityTypeToDocField";
import { EntityType } from "./entityTypes";
import { LoftEntity } from "./loftEntity";
import { PolylineEntity } from "./polylineEntity";

const entityTypeToSingularName: Record<EntityType, string> = {
  WORKPLANE: "Work Plane",
  POLYLINE: "Polyline",
  LOFT: "Loft",
};

export function entityName(doc: Doc, entityType: EntityType): string {
  const count = Object.keys(doc[entityTypeToDocField[entityType]]).length;
  return `${entityTypeToSingularName[entityType]} ${count + 1}`;
}

export function polylineNew(polyline: Polyline2, name: string): PolylineEntity {
  return {
    id: uid<PolylineId>(),
    type: "POLYLINE",
    name,
    polyline,
  };
}

export function loftNew(
  polyline1: PolylineId,
  polyline2: PolylineId,
  name: string
): LoftEntity {
  return {
    id: uid<LoftId>(),
    type: "LOFT",
    name,
    polyline1,
    polyline2,
  };
}
