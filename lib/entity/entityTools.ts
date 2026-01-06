import { Doc } from "../state/doc";
import { Table } from "../util/table";
import { Entity } from "./entity";
import { EntityType } from "./entityTypes";
import { entityTypeToDocField } from "./entityTypeToDocField";
import { EntityHandle } from "./handleTypes";

type HandleToEntityMap = {
  [K in EntityType]: Extract<Entity, { type: K }>;
};

export function getEntityFromHandle<H extends EntityHandle>(
  doc: Doc,
  handle: H
): HandleToEntityMap[H["type"]] | undefined {
  const fieldName = entityTypeToDocField[handle.type];
  const table = doc[fieldName] as Table<any, HandleToEntityMap[H["type"]]>;
  if (!table) return undefined;
  return table[handle.id];
}
