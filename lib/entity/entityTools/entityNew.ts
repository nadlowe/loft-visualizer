import { Plane3, Polyline2 } from "../../geom/geomTypes";
import { LoftId, PolylineId, uid, WorkPlaneId } from "../../util/uid";
import { LoftEntity } from "../loftEntity";
import { PolylineEntity } from "../polylineEntity";
import { WorkPlaneEntity } from "../workPlaneEntity";

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
