"use client";

import { colors } from "@/components/colors";
import { fonts } from "@/components/fonts";
import { LoftHandle } from "@/lib/entity/handleTypes";
import { useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";
import { EntityDropdown } from "../EntityDropdown";
import { ShiftInput } from "./ShiftInput";

export function LoftInspector({ handle }: { handle: LoftHandle }) {
  const { doc, updateEntity } = useStore();
  const loft = doc.lofts[handle.id];

  if (!loft) return null;

  return (
    <div className="flex flex-col gap-3">
      <EntityDropdown
        handle={handle}
        field="polyline1"
        targetEntityType="POLYLINE"
        label="Polyline 1"
        placeholder="Select"
      />
      <ShiftInput
        label="Shift 1"
        value={loft.polyline1Shift}
        onChange={(value) =>
          updateEntity(handle, (entity) => ({
            ...entity,
            polyline1Shift: value,
          }))
        }
      />
      <div className="flex cursor-pointer items-center justify-between">
        <span className={cn(fonts.size.xs, colors.text.secondary)}>
          Reverse 1
        </span>
        <button
          onClick={() =>
            updateEntity(handle, (entity) => ({
              ...entity,
              polyline1Reverse: !entity.polyline1Reverse,
            }))
          }
          className={cn(
            "relative h-4 w-7 rounded-full transition-colors",
            loft.polyline1Reverse ? colors.toggle.on : colors.toggle.off
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform",
              loft.polyline1Reverse ? "left-[14px]" : "left-0.5"
            )}
          />
        </button>
      </div>
      <EntityDropdown
        handle={handle}
        field="polyline2"
        targetEntityType="POLYLINE"
        label="Polyline 2"
        placeholder="Select"
      />
      <ShiftInput
        label="Shift 2"
        value={loft.polyline2Shift}
        onChange={(value) =>
          updateEntity(handle, (entity) => ({
            ...entity,
            polyline2Shift: value,
          }))
        }
      />
      <div className="flex cursor-pointer items-center justify-between">
        <span className={cn(fonts.size.xs, colors.text.secondary)}>
          Reverse 2
        </span>
        <button
          onClick={() =>
            updateEntity(handle, (entity) => ({
              ...entity,
              polyline2Reverse: !entity.polyline2Reverse,
            }))
          }
          className={cn(
            "relative h-4 w-7 rounded-full transition-colors",
            loft.polyline2Reverse ? colors.toggle.on : colors.toggle.off
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform",
              loft.polyline2Reverse ? "left-[14px]" : "left-0.5"
            )}
          />
        </button>
      </div>
    </div>
  );
}
