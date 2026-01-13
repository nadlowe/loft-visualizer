"use client";

import { colors } from "@/components/colors";
import { fonts } from "@/components/fonts";
import { PolylineHandle } from "@/lib/entity/handleTypes";
import { polyline2Reverse, polyline2Shift } from "@/lib/geom/polyline2";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useState } from "react";
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

  const handleReverse = () => {
    if (polyline) {
      updateEntity(handle, (entity) => ({
        ...entity,
        polyline: polyline2Reverse(entity.polyline),
      }));
      setShiftValue(0);
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
        <span className={cn(fonts.size.xs, colors.text.secondary)}>
          Vertices
        </span>
        <span className={cn(fonts.size.sm, colors.text.primary)}>
          {vertexCount}
        </span>
      </div>
      <ShiftInput
        label="Shift"
        value={shiftValue}
        onChange={handleShiftChange}
      />
      <button
        onClick={handleReverse}
        className={cn(
          "mt-1 rounded border px-3 py-1.5 text-xs transition-all",
          colors.border.primary,
          colors.text.secondary,
          "hover:" + colors.bg.secondary,
          "active:bg-blue-500"
        )}
      >
        Reverse Polyline
      </button>
      <div className="flex items-center justify-between">
        <span className={cn(fonts.size.xs, colors.text.secondary)}>Closed</span>
        <span className={cn(fonts.size.sm, colors.text.primary)}>
          {polyline?.closed ? "True" : "False"}
        </span>
      </div>
    </div>
  );
}
