import { LoftEntity } from "../loftEntity";
import { PolylineEntity } from "../polylineEntity";
import { WorkPlaneEntity } from "../workPlaneEntity";

export type EntityTypeToEntity = {
  WORKPLANE: WorkPlaneEntity;
  POLYLINE: PolylineEntity;
  LOFT: LoftEntity;
};
