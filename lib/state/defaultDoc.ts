import { LoftEntity } from "../entity/loftEntity";
import { PolylineEntity } from "../entity/polylineEntity";
import { WorkPlaneEntity } from "../entity/workPlaneEntity";
import { LoftId, PolylineId, uid, WorkPlaneId } from "../util/uid";
import { Doc } from "./doc";

// export function defaultDocInit(): Doc {
//   return {
//     id: uid(),
//     name: "Untitled",
//     workPlanes: {},
//     polylines: {},
//     lofts: {},
//   };
// }

export function defaultDocInit(): Doc {
  const wp1Id = uid<WorkPlaneId>();
  const wp2Id = uid<WorkPlaneId>();
  const poly1Id = uid<PolylineId>();
  const poly2Id = uid<PolylineId>();
  const poly3Id = uid<PolylineId>();
  const loft1Id = uid<LoftId>();
  const loft2Id = uid<LoftId>();

  const workPlanes: Record<WorkPlaneId, WorkPlaneEntity> = {
    [wp1Id]: {
      id: wp1Id,
      type: "WORKPLANE",
      name: "Work Plane 1",
      plane3: {
        origin: [0, 0, 0],
        normal: [0, 0, 1],
        u: [1, 0, 0],
      },
    },
    [wp2Id]: {
      id: wp2Id,
      type: "WORKPLANE",
      name: "Work Plane 2",
      plane3: {
        origin: [0, 0, 5],
        normal: [0, 1, 0],
        u: [1, 0, 0],
      },
    },
  };

  const polylines: Record<PolylineId, PolylineEntity> = {
    [poly1Id]: {
      id: poly1Id,
      type: "POLYLINE",
      name: "Polyline 1",
      polyline: [0, 0, 10, 0, 10, 10, 0, 10],
      workPlaneId: wp1Id,
    },
    [poly2Id]: {
      id: poly2Id,
      type: "POLYLINE",
      name: "Polyline 2",
      polyline: [5, 5, 15, 5, 15, 15, 5, 15],
      workPlaneId: wp1Id,
    },
    [poly3Id]: {
      id: poly3Id,
      type: "POLYLINE",
      name: "Polyline 3",
      polyline: [2, 2, 8, 2, 8, 8, 2, 8],
      workPlaneId: wp2Id,
    },
  };

  const lofts: Record<LoftId, LoftEntity> = {
    [loft1Id]: {
      id: loft1Id,
      type: "LOFT",
      name: "Loft 1",
      polyline1: poly1Id,
      polyline2: poly2Id,
    },
    [loft2Id]: {
      id: loft2Id,
      type: "LOFT",
      name: "Loft 2",
      polyline1: poly2Id,
      polyline2: poly3Id,
    },
  };

  return {
    id: uid(),
    name: "Untitled",
    workPlanes,
    polylines,
    lofts,
  };
}

export const defaultDoc: Doc = defaultDocInit();
