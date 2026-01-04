import { Doc } from "../state/doc";
import { LoftId, PolylineId, WorkPlaneId } from "../util/uid";
import { parseHandle } from "./handle";
import { EntityHandle } from "./handleTypes";

export function getEntityFromHandle(doc: Doc, handle: EntityHandle) {
  const { type, id } = parseHandle(handle);
  switch (type) {
    case "WORKPLANE":
      return doc.workPlanes[id as WorkPlaneId];
    case "POLYLINE":
      return doc.polylines[id as PolylineId];
    case "LOFT":
      return doc.lofts[id as LoftId];
  }
}
