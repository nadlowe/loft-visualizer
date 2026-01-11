import { LoftId, PolylineId } from "../util/uid";
import { BaseEntity } from "./baseEntity";

interface BaseLoft extends BaseEntity<LoftId> {
  readonly type: "LOFT";
  readonly polyline1: PolylineId;
  readonly polyline2: PolylineId;
}

export interface LoftSimpleEntity extends BaseLoft {
  readonly loftType: "SIMPLE";
  readonly polyline1: PolylineId;
  readonly polyline2: PolylineId;
  readonly polyline1Shift: number;
  readonly polyline2Shift: number;
  readonly polyline1Reverse?: boolean;
  readonly polyline2Reverse?: boolean;
}

export interface LoftSeamEntity extends BaseLoft {
  readonly loftType: "SEAM";
  readonly polyline1: PolylineId;
  readonly polyline2: PolylineId;
  readonly seamIndexA: number;
  readonly seamIndexB: number;
}

export type LoftEntity = LoftSimpleEntity | LoftSeamEntity;

export function isLoftSimpleEntity(loft: LoftEntity): loft is LoftSimpleEntity {
  return loft.loftType === "SIMPLE";
}
