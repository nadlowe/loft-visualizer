import { Plane3, Polyline2 } from "../../geom/geomTypes";
import { Doc } from "../../state/doc";
import { LoftId, PolylineId, uid, WorkPlaneId } from "../../util/uid";
import { EntityType } from "../entityTypes";
import { LoftEntity } from "../loftEntity";
import { PolylineEntity } from "../polylineEntity";
import { WorkPlaneEntity } from "../workPlaneEntity";
import { entityTypeToDocField } from "./entityTypeToDocField";
import { entityTypeToName } from "./entityTypeToName";

export function entityName(doc: Doc, entityType: EntityType): string {
  const count = Object.keys(doc[entityTypeToDocField[entityType]]).length;
  return `${entityTypeToName.singular[entityType]} ${count + 1}`;
}

export function polylineNew(
  polyline: Polyline2,
  name: string,
  closed = false
): PolylineEntity {
  return {
    id: uid<PolylineId>(),
    type: "POLYLINE",
    name,
    polyline,
    closed,
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
    polyline1Shift: 0,
    polyline2Shift: 0,
  };
}

export function workPlaneNew(plane3: Plane3, name: string): WorkPlaneEntity {
  return {
    id: uid<WorkPlaneId>(),
    type: "WORKPLANE",
    name,
    plane3,
  };
}
