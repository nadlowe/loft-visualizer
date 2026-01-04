"use client";

import { parseHandle } from "@/lib/entity/handle";
import { EntityHandle } from "@/lib/entity/handleTypes";
import { LoftEntity } from "@/lib/entity/loftEntity";
import { useStore } from "@/lib/state/useStore";
import { EntityId, LoftId, PolylineId } from "@/lib/util/uid";
import { EntityDropdown } from "../EntityDropdown";
import { InspectorHeader } from "./InspectorHeader";

interface LoftInspectorProps {
  entity: LoftEntity;
  handle: EntityHandle;
}

export function LoftInspector({ entity, handle }: LoftInspectorProps) {
  const { doc, updateLoft } = useStore();
  const { id } = parseHandle(handle);
  const loftId = id as LoftId;

  const handlePolyline1Change = (polylineId: EntityId | undefined) => {
    if (!polylineId) return;
    updateLoft(loftId, (loft) => ({
      ...loft,
      polyline1: polylineId as PolylineId,
    }));
  };

  const handlePolyline2Change = (polylineId: EntityId | undefined) => {
    if (!polylineId) return;
    updateLoft(loftId, (loft) => ({
      ...loft,
      polyline2: polylineId as PolylineId,
    }));
  };

  return (
    <div className="flex flex-col gap-4">
      <InspectorHeader entity={entity} entityType="LOFT" handle={handle} />
      <EntityDropdown
        doc={doc}
        entityType="POLYLINE"
        value={entity.polyline1}
        onChange={handlePolyline1Change}
        label="Polyline 1"
        placeholder="Select polyline"
      />
      <EntityDropdown
        doc={doc}
        entityType="POLYLINE"
        value={entity.polyline2}
        onChange={handlePolyline2Change}
        label="Polyline 2"
        placeholder="Select polyline"
      />
    </div>
  );
}
