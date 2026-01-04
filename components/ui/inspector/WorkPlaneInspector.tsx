"use client";

import { EntityHandle } from "@/lib/entity/handleTypes";
import { WorkPlaneEntity } from "@/lib/entity/workPlaneEntity";
import { InspectorHeader } from "./InspectorHeader";

interface WorkPlaneInspectorProps {
  entity: WorkPlaneEntity;
  handle: EntityHandle;
}

export function WorkPlaneInspector({
  entity,
  handle,
}: WorkPlaneInspectorProps) {
  return (
    <div className="flex flex-col gap-4">
      <InspectorHeader entity={entity} entityType="WORKPLANE" handle={handle} />
      {/* Work plane specific properties can be added here */}
    </div>
  );
}
