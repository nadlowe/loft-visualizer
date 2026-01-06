"use client";

import { PolylineHandle } from "@/lib/entity/handleTypes";
import { useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";
import { colors } from "../../colors";
import { EntityDropdown } from "../EntityDropdown";

export function PolylineInspector({ handle }: { handle: PolylineHandle }) {
  const { doc } = useStore();
  const polyline = doc.polylines[handle.id];
  const vertexCount = polyline ? Math.floor(polyline.polyline.length / 2) : 0;

  return (
    <div className="flex flex-col gap-4">
      <EntityDropdown
        handle={handle}
        field="workPlaneId"
        targetEntityType="WORKPLANE"
      />
      <div className="flex flex-col gap-1">
        <span className={cn("text-xs", colors.text.secondary)}>Vertices</span>
        <span className={cn("text-sm", colors.text.primary)}>
          {vertexCount}
        </span>
      </div>
      {polyline?.closed && (
        <div className="flex items-center gap-2">
          <span className={cn("text-xs", colors.text.secondary)}>Closed</span>
          <span className={cn("text-sm text-blue-400")}>Yes</span>
        </div>
      )}
    </div>
  );
}
