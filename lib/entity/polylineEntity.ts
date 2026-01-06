import { Polyline2 } from "../geom/geomTypes";
import { PolylineId, WorkPlaneId } from "../util/uid";
import { BaseEntity } from "./baseEntity";

export interface PolylineEntity extends BaseEntity<PolylineId> {
  readonly type: "POLYLINE";
  readonly polyline: Polyline2;
  readonly workPlaneId?: WorkPlaneId;
  readonly closed?: boolean;
}
