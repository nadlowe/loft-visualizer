"use client";

import { loftSeamNew, loftSimpleNew } from "@/lib/entity/entityTools/entityNew";
import { entityName } from "@/lib/entity/entityTools/entityTypeToName";
import { useStore } from "@/lib/state/useStore";
import { PolylineId } from "@/lib/util/uid";
import { useEffect } from "react";

export function LoftCmd() {
  const { cmd, selectedHandles, doc, addEntity, finishCmd } = useStore();

  useEffect(() => {
    if (cmd?.type === "ADD_LOFT") {
      const selectedArray = Array.from(selectedHandles);

      // Filter to only POLYLINE handles
      const polylineHandles = selectedArray.filter((handle) => {
        return handle.type === "POLYLINE";
      });

      if (polylineHandles.length === 2) {
        const name = entityName(doc, "LOFT");
        const pl1 = polylineHandles[0].id as PolylineId;
        const pl2 = polylineHandles[1].id as PolylineId;

        const newLoft =
          cmd.loftType === "SEAM"
            ? loftSeamNew(doc, pl1, pl2, name)
            : loftSimpleNew(pl1, pl2, name);

        addEntity(newLoft);
        finishCmd();
      }
    }
  }, [cmd, selectedHandles, doc, addEntity, finishCmd]);

  return null;
}
