"use client";

import { BaseEntity } from "@/lib/entity/baseEntity";
import { EntityType } from "@/lib/entity/entityTypes";
import { EntityHandle } from "@/lib/entity/handleTypes";
import { cn } from "@/lib/utils";
import { colors } from "../../colors";
import { fonts } from "../../fonts";
import { EditableEntityName } from "../EditableEntityName";
import { LoftIcon, PolylineIcon, WorkPlaneIcon } from "../Icons";

interface InspectorHeaderProps {
  entity: BaseEntity<any>;
  entityType: EntityType;
  handle: EntityHandle;
}

const typeLabels: Record<EntityType, string> = {
  WORKPLANE: "Work Plane",
  POLYLINE: "Polyline",
  LOFT: "Loft",
};

const typeIcons: Record<
  EntityType,
  React.ComponentType<{ className?: string }>
> = {
  WORKPLANE: WorkPlaneIcon,
  POLYLINE: PolylineIcon,
  LOFT: LoftIcon,
};

export function InspectorHeader({
  entity,
  entityType,
  handle,
}: InspectorHeaderProps) {
  const Icon = typeIcons[entityType];
  const typeLabel = typeLabels[entityType];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Icon className={cn("h-5 w-5", colors.text.primary)} />
        <span
          className={cn(
            fonts.weight.semibold,
            fonts.size.base,
            colors.text.primary
          )}
        >
          {typeLabel}
        </span>
      </div>
      <EditableEntityName handle={handle} />
    </div>
  );
}
