"use client";

import { LoftHandle } from "@/lib/entity/handleTypes";
import { useStore } from "@/lib/state/useStore";
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
    </div>
  );
}
