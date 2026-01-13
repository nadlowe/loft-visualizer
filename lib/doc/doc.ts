import { LoftEntity } from "@/lib/entity/loftEntity";
import { PolylineEntity } from "@/lib/entity/polylineEntity";
import { WorkPlaneEntity } from "@/lib/entity/workPlaneEntity";
import { Table } from "@/lib/util/table";
import { DocId, LoftId, PolylineId, WorkPlaneId } from "@/lib/util/uid";

export interface Doc {
  readonly id: DocId;
  readonly name: string;
  readonly workPlanes: Table<WorkPlaneId, WorkPlaneEntity>;
  readonly polylines: Table<PolylineId, PolylineEntity>;
  readonly lofts: Table<LoftId, LoftEntity>;
}
