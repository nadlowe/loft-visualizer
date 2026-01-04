"use client";

import { EntityType } from "@/lib/entity/entityTypes";
import { entityTypeToDocField } from "@/lib/entity/entityTypeToDocField";
import { Doc } from "@/lib/state/doc";
import { EntityId } from "@/lib/util/uid";
import { cn } from "@/lib/utils";
import { colors } from "./colors";

interface EntityDropdownProps {
  doc: Doc;
  entityType: EntityType;
  value: EntityId | undefined;
  onChange: (id: EntityId | undefined) => void;
  label?: string;
  placeholder?: string;
}

export function EntityDropdown({
  doc,
  entityType,
  value,
  onChange,
  label,
  placeholder,
}: EntityDropdownProps) {
  const fieldName = entityTypeToDocField[entityType];
  const entities = doc[fieldName] as Record<string, { name: string }>;

  const entityEntries = Object.entries(entities);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value || undefined;
    onChange(newValue as EntityId | undefined);
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm text-gray-400">{label}</label>}
      <select
        value={value || ""}
        onChange={handleChange}
        className={cn(
          "w-full rounded border bg-gray-800 px-2 py-1.5 text-sm transition-colors outline-none",
          colors.border.primary,
          colors.text.primary,
          "hover:" + colors.bg.secondary,
          "focus:" + colors.bg.secondary
        )}
      >
        <option value="">{placeholder || "None"}</option>
        {entityEntries.map(([id, entity]) => (
          <option key={id} value={id}>
            {entity.name}
          </option>
        ))}
      </select>
    </div>
  );
}
