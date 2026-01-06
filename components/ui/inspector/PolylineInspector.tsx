"use client";

import { PolylineHandle } from "@/lib/entity/handleTypes";
import { EntityDropdown } from "../EntityDropdown";

export function PolylineInspector({ handle }: { handle: PolylineHandle }) {
  return (
    <div className="flex flex-col gap-4">
      <EntityDropdown
        handle={handle}
        field="workPlaneId"
        targetEntityType="WORKPLANE"
      />
    </div>
  );
}
