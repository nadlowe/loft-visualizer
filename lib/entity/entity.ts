import { LoftEntity } from "./loftEntity";
import { PolylineEntity } from "./polylineEntity";
import { WorkPlaneEntity } from "./workPlaneEntity";

export type Entity = WorkPlaneEntity | PolylineEntity | LoftEntity;

export type EntityTypeMap = {
  WORKPLANE: WorkPlaneEntity;
  POLYLINE: PolylineEntity;
  LOFT: LoftEntity;
};
