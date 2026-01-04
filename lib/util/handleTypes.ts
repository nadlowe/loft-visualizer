import { LoftId, PolylineId, WorkPlaneId } from "./uid";

export type EntityHandle =
  | `polyline.${PolylineId}`
  | `workplane.${WorkPlaneId}`
  | `loft.${LoftId}`;
