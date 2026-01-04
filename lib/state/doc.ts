import { LoftEntity } from "../entity/loftEntity";
import { PolylineEntity } from "../entity/polylineEntity";
import { WorkPlaneEntity } from "../entity/workPlaneEntity";
import { Table } from "../util/table";
import { LoftId, PolylineId, WorkPlaneId } from "../util/uid";

export interface Doc {
  readonly workPlanes: Table<WorkPlaneId, WorkPlaneEntity>;
  readonly polylines: Table<PolylineId, PolylineEntity>;
  readonly lofts: Table<LoftId, LoftEntity>;
}
