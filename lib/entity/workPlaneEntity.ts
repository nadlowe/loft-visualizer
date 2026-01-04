import { Plane3 } from "../geom/geomTypes";
import { WorkPlaneId } from "../util/uid";
import { BaseEntity } from "./baseEntity";

export interface WorkPlaneEntity extends BaseEntity<WorkPlaneId> {
  readonly type: "WORKPLANE";
  readonly plane3: Plane3;
}
