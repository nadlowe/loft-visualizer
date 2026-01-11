import { LoftId, PolylineId } from "../util/uid";
import { BaseEntity } from "./baseEntity";

export interface LoftEntity extends BaseEntity<LoftId> {
  readonly type: "LOFT";
  readonly polyline1: PolylineId;
  readonly polyline2: PolylineId;
  readonly seamIndexA: number;
  readonly seamIndexB: number;
}
