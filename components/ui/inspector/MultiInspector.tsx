"use client";

import { EntityType } from "@/lib/entity/entityTypes";
import { getEntityFromHandle } from "@/lib/entity/entityUtils";
import { parseHandle } from "@/lib/entity/handle";
import { EntityHandle } from "@/lib/entity/handleTypes";
import { Doc } from "@/lib/state/doc";
import { cn } from "@/lib/utils";
import { colors } from "../../colors";
import { fonts } from "../../fonts";
import { InspectorHeader } from "./InspectorHeader";

interface MultiInspectorProps {
  doc: Doc;
  handles: EntityHandle[];
}

export function MultiInspector({ doc, handles }: MultiInspectorProps) {
  const entities = handles
    .map((handle) => {
      const entity = getEntityFromHandle(doc, handle);
      const { type } = parseHandle(handle);
      return entity ? { handle, entity, type } : null;
    })
    .filter(
      (item): item is { handle: EntityHandle; entity: any; type: EntityType } =>
        item !== null
    );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <span
          className={cn(
            fonts.weight.semibold,
            fonts.size.base,
            colors.text.primary
          )}
        >
          Multiple Entities
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {entities.map(({ handle, entity, type }) => (
          <InspectorHeader key={handle} entity={entity} entityType={type} />
        ))}
      </div>
    </div>
  );
}
