import { Doc } from "@/lib/doc/doc";
import { Table } from "../../util/table";
import { Entity } from "../entity";
import { EntityType } from "../entityTypes";
import { EntityHandle } from "../handleTypes";
import { entityTypeToDocField } from "./entityTypeToDocField";

type HandleToEntityMap = {
  [K in EntityType]: Extract<Entity, { type: K }>;
};

export function getEntityFromHandle<H extends EntityHandle>(
  doc: Doc,
  handle: H
): HandleToEntityMap[H["type"]] | undefined {
  const fieldName = entityTypeToDocField[handle.type];
  const table = doc[fieldName] as Table<string, HandleToEntityMap[H["type"]]>;
  if (!table) return undefined;
  return table[handle.id] as HandleToEntityMap[H["type"]];
}
