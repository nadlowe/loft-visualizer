import { worldPlaneXY } from "@/lib/geom/plane3";
import { projectPolyline2ToPlane3 } from "@/lib/geom/project";
import { determineLoftSeam } from "@/lib/geom/utils";
import { Doc } from "@/lib/state/doc";
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

export function loftSimpleNew(
  polyline1: PolylineId,
  polyline2: PolylineId,
  name: string
): LoftEntity {
  return {
    id: uid<LoftId>(),
    type: "LOFT",
    loftType: "SIMPLE",
    name,
    polyline1,
    polyline2,
    polyline1Shift: 0,
    polyline2Shift: 0,
  };
}

export function loftSeamNew(
  doc: Doc,
  polyline1: PolylineId,
  polyline2: PolylineId,
  name: string
): LoftEntity {
  const docPl1 = doc.polylines[polyline1];
  const docPl2 = doc.polylines[polyline2];

  // Apply shift and reverse transformations
  const { pl1, pl2 } = { pl1: docPl1.polyline, pl2: docPl2.polyline };

  // Use overrides if provided, otherwise look up from doc
  const plane1 = docPl1.workPlaneId
    ? doc.workPlanes[docPl1.workPlaneId]?.plane3
    : worldPlaneXY();
  const plane2 = docPl2.workPlaneId
    ? doc.workPlanes[docPl2.workPlaneId]?.plane3
    : worldPlaneXY();

  // If both polylines are closed, skip the duplicate closing vertex to avoid duplicate sections
  const bothClosed = docPl1.closed && docPl2.closed;
  const { pl3: pl3A, pl2: pl2A } = projectPolyline2ToPlane3(
    pl1,
    plane1,
    bothClosed
  );
  const { pl3: pl3B, pl2: pl2B } = projectPolyline2ToPlane3(
    pl2,
    plane2,
    bothClosed
  );

  const { seamIndexA, seamIndexB } = determineLoftSeam(
    pl2A,
    plane1,
    pl3A,
    pl2B,
    plane2,
    pl3B
  );

  return {
    id: uid<LoftId>(),
    type: "LOFT",
    loftType: "SEAM",
    name,
    polyline1,
    polyline2,
    seamIndexA,
    seamIndexB,
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
