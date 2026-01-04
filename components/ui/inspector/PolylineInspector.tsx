"use client";

import { parseHandle } from "@/lib/entity/handle";
import { EntityHandle } from "@/lib/entity/handleTypes";
import { PolylineEntity } from "@/lib/entity/polylineEntity";
import { useStore } from "@/lib/state/useStore";
import { EntityId, PolylineId, WorkPlaneId } from "@/lib/util/uid";
import { EntityDropdown } from "../EntityDropdown";
import { InspectorHeader } from "./InspectorHeader";

interface PolylineInspectorProps {
  entity: PolylineEntity;
  handle: EntityHandle;
}

export function PolylineInspector({ entity, handle }: PolylineInspectorProps) {
  const { doc, updatePolyline } = useStore();
  const { id } = parseHandle(handle);
  const polylineId = id as PolylineId;

  const handleWorkPlaneChange = (workPlaneId: EntityId | undefined) => {
    updatePolyline(polylineId, (polyline) => ({
      ...polyline,
      workPlaneId: workPlaneId as WorkPlaneId | undefined,
    }));
  };

  return (
    <div className="flex flex-col gap-4">
      <InspectorHeader entity={entity} entityType="POLYLINE" handle={handle} />
      <EntityDropdown
        doc={doc}
        entityType="WORKPLANE"
        value={entity.workPlaneId}
        onChange={handleWorkPlaneChange}
        label="Work Plane"
        placeholder="None"
      />
    </div>
  );
}
