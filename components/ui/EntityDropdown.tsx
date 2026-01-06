"use client";

import { Entity } from "@/lib/entity/entity";
import { getEntityFromHandle } from "@/lib/entity/entityTools";
import { EntityType } from "@/lib/entity/entityTypes";
import { entityTypeToDocField } from "@/lib/entity/entityTypeToDocField";
import { EntityHandle } from "@/lib/entity/handleTypes";
import { useStore } from "@/lib/state/useStore";
import { EntityId } from "@/lib/util/uid";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/shallow";
import { colors } from "./colors";

type HandleToEntityMap = {
  [K in EntityType]: Extract<Entity, { type: K }>;
};

type EntityIdKeys<T> = {
  [K in keyof T]: T[K] extends EntityId | undefined ? K : never;
}[keyof T];

interface EntityDropdownProps<H extends EntityHandle> {
  handle: H;
  field: EntityIdKeys<HandleToEntityMap[H["type"]]>;
  targetEntityType: EntityType;
  placeholder?: string;
}

export function EntityDropdown<H extends EntityHandle>({
  handle,
  field,
  targetEntityType,
  placeholder = "None",
}: EntityDropdownProps<H>) {
  const { currentValue, targetEntities, updateEntity } = useStore(
    useShallow((state) => ({
      currentValue: getEntityFromHandle(state.doc, handle)?.[field] as
        | EntityId
        | undefined,
      targetEntities: state.doc[
        entityTypeToDocField[targetEntityType]
      ] as Record<string, { name: string }>,
      updateEntity: state.updateEntity,
    }))
  );

  const entityEntries = Object.entries(targetEntities);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value || undefined;
    updateEntity(handle, (entity) => ({
      ...entity,
      [field]: newValue,
    }));
  };

  return (
    <div className="flex flex-col gap-1">
      <select
        value={currentValue || ""}
        onChange={handleChange}
        className={cn(
          "w-full rounded border bg-gray-800 px-2 py-1.5 text-sm transition-colors outline-none",
          colors.border.primary,
          colors.text.primary,
          "hover:" + colors.bg.secondary,
          "focus:" + colors.bg.secondary
        )}
      >
        <option value="">{placeholder}</option>
        {entityEntries.map(([id, entity]) => (
          <option key={id} value={id}>
            {entity.name}
          </option>
        ))}
      </select>
    </div>
  );
}
