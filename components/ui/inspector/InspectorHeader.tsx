"use client";

import { EntityHandle, SelectableHandle } from "@/lib/entity/handleTypes";
import { useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";
import { colors } from "../../colors";
import { fonts } from "../../fonts";
import { EditableEntityName } from "../EditableEntityName";
import { LoftIcon, PolylineIcon, WorkPlaneIcon } from "../Icons";

interface InspectorHeaderProps {
  handle: SelectableHandle;
}

const typeLabels: Record<EntityHandle["type"], string> = {
  WORKPLANE: "Work Plane",
  POLYLINE: "Polyline",
  LOFT: "Loft",
};

const typeIcons: Record<
  EntityHandle["type"],
  React.ComponentType<{ className?: string }>
> = {
  WORKPLANE: WorkPlaneIcon,
  POLYLINE: PolylineIcon,
  LOFT: LoftIcon,
};

export function InspectorHeader({ handle }: InspectorHeaderProps) {
  const { doc } = useStore();

  // Handle vertex type specially
  if (handle.type === "VERTEX") {
    const polyline = doc.polylines[handle.polylineId];
    const polylineName = polyline?.name || "Polyline";
    return (
      <div
        className={cn(
          "-mx-4 flex flex-col gap-2 px-4 pb-2",
          "border-b",
          colors.border.primary
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              fonts.weight.semibold,
              fonts.size.base,
              colors.text.primary
            )}
          >
            Vertex
          </span>
        </div>
        <span className={cn(fonts.size.sm, colors.text.secondary)}>
          {polylineName} · Vertex {handle.vertexIndex + 1}
        </span>
      </div>
    );
  }

  const entityType = handle.type;
  const Icon = typeIcons[entityType];
  const typeLabel = typeLabels[entityType];

  return (
    <div
      className={cn(
        "-mx-4 flex flex-col gap-2 px-4 pb-2",
        "border-b",
        colors.border.primary
      )}
    >
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
