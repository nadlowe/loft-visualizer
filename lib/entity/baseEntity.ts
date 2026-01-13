import { EntityId } from "../util/uid";
import { EntityType } from "./entityTypes";

export interface BaseEntity<Id extends EntityId> {
  readonly type: EntityType;
  readonly id: Id;
  readonly name: string;
  readonly hidden?: boolean;
}
