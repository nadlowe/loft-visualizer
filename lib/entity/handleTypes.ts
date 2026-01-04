import { LoftId, PolylineId, WorkPlaneId } from "../util/uid";

export type EntityHandle =
  | `polyline.${PolylineId}`
  | `workplane.${WorkPlaneId}`
  | `loft.${LoftId}`;
