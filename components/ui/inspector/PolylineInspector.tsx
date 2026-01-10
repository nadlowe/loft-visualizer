"use client";

import { PolylineHandle } from "@/lib/entity/handleTypes";
import { polyline2Shift } from "@/lib/geom/polyline2";
import { useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";
import { colors } from "../../colors";
import { EntityDropdown } from "../EntityDropdown";
import { RotateLeftIcon, RotateRightIcon } from "../Icons";

export function PolylineInspector({ handle }: { handle: PolylineHandle }) {
  const { doc, updateEntity } = useStore();
  const polyline = doc.polylines[handle.id];
  const vertexCount = polyline ? Math.floor(polyline.polyline.length / 2) : 0;

  const handleShift = (amount: number) => {
    if (!polyline) return;
    updateEntity(handle, (entity) => ({
      ...entity,
      polyline: polyline2Shift(entity.polyline, amount),
    }));
  };

  return (
    <div className="flex flex-col gap-4">
      <EntityDropdown
        handle={handle}
        field="workPlaneId"
        targetEntityType="WORKPLANE"
      />
      <div className="flex flex-col gap-1">
        <span className={cn("text-xs", colors.text.secondary)}>Vertices</span>
        <div className="flex items-center gap-2">
          <span className={cn("text-sm", colors.text.primary)}>
            {vertexCount}
          </span>
          <button
            onClick={() => handleShift(-1)}
            className={cn(
              "rounded p-1 transition-colors hover:bg-white/10",
              colors.text.secondary
            )}
            title="Shift vertices left"
          >
            <RotateLeftIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleShift(1)}
            className={cn(
              "rounded p-1 transition-colors hover:bg-white/10",
              colors.text.secondary
            )}
            title="Shift vertices right"
          >
            <RotateRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className={cn("text-xs", colors.text.secondary)}>Closed</span>
        <span className={cn("text-sm", colors.text.primary)}>
          {polyline?.closed ? "Yes" : "No"}
        </span>
      </div>
    </div>
  );
}
