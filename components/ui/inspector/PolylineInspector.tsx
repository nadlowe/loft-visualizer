"use client";

import { PolylineHandle } from "@/lib/entity/handleTypes";
import { polyline2Shift } from "@/lib/geom/polyline2";
import { useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { colors } from "../../colors";
import { EntityDropdown } from "../EntityDropdown";
import { ShiftInput } from "./ShiftInput";

export function PolylineInspector({ handle }: { handle: PolylineHandle }) {
  const { doc, updateEntity } = useStore();
  const polyline = doc.polylines[handle.id];
  const vertexCount = polyline ? Math.floor(polyline.polyline.length / 2) : 0;
  const [shiftValue, setShiftValue] = useState(0);

  const handleShiftChange = (newValue: number) => {
    if (polyline) {
      const delta = newValue - shiftValue;
      if (delta !== 0) {
        updateEntity(handle, (entity) => ({
          ...entity,
          polyline: polyline2Shift(entity.polyline, delta),
        }));
        setShiftValue(newValue);
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <EntityDropdown
        handle={handle}
        field="workPlaneId"
        targetEntityType="WORKPLANE"
        label="Work Plane"
      />
      <div className="flex items-center justify-between">
        <span className={cn("text-xs", colors.text.secondary)}>Vertices</span>
        <span className={cn("text-sm", colors.text.primary)}>
          {vertexCount}
        </span>
      </div>
      <ShiftInput
        label="Shift"
        value={shiftValue}
        onChange={handleShiftChange}
      />
      <div className="flex items-center justify-between">
        <span className={cn("text-xs", colors.text.secondary)}>Closed</span>
        <span className={cn("text-sm", colors.text.primary)}>
          {polyline?.closed ? "True" : "False"}
        </span>
      </div>
    </div>
  );
}
