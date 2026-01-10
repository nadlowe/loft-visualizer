"use client";

import { LoftHandle } from "@/lib/entity/handleTypes";
import { EntityDropdown } from "../EntityDropdown";

export function LoftInspector({ handle }: { handle: LoftHandle }) {
  return (
    <div className="flex flex-col gap-3">
      <EntityDropdown
        handle={handle}
        field="polyline1"
        targetEntityType="POLYLINE"
        label="Polyline 1"
        placeholder="Select"
      />
      <EntityDropdown
        handle={handle}
        field="polyline2"
        targetEntityType="POLYLINE"
        label="Polyline 2"
        placeholder="Select"
      />
    </div>
  );
}
