"use client";

import { LoftHandle } from "@/lib/entity/handleTypes";
import { EntityDropdown } from "../EntityDropdown";

export function LoftInspector({ handle }: { handle: LoftHandle }) {
  return (
    <div className="flex flex-col gap-4">
      <EntityDropdown
        handle={handle}
        field="polyline1"
        targetEntityType="POLYLINE"
        placeholder="Select polyline"
      />
      <EntityDropdown
        handle={handle}
        field="polyline2"
        targetEntityType="POLYLINE"
        placeholder="Select polyline"
      />
    </div>
  );
}
