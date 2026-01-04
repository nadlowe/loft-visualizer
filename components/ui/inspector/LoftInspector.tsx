"use client";

import { EntityHandle } from "@/lib/entity/handleTypes";
import { LoftEntity } from "@/lib/entity/loftEntity";
import { InspectorHeader } from "./InspectorHeader";

interface LoftInspectorProps {
  entity: LoftEntity;
  handle: EntityHandle;
}

export function LoftInspector({ entity, handle }: LoftInspectorProps) {
  return (
    <div className="flex flex-col gap-4">
      <InspectorHeader entity={entity} entityType="LOFT" handle={handle} />
      {/* Loft specific properties can be added here */}
    </div>
  );
}
