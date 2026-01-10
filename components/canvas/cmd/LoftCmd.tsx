"use client";

import { entityName, loftNew } from "@/lib/entity/entityTools/entityNew";
import { useStore } from "@/lib/state/useStore";
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
        const newLoft = loftNew(
          polylineHandles[0].id,
          polylineHandles[1].id,
          entityName(doc, "LOFT")
        );

        addEntity(newLoft);
        finishCmd();
      }
    }
  }, [cmd, selectedHandles, doc, addEntity, finishCmd]);

  return null;
}
