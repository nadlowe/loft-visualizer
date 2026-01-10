"use client";

import { entityName, loftNew } from "@/lib/entity/entityNew";
import { handleNew } from "@/lib/entity/handle";
import { useStore } from "@/lib/state/useStore";
import { useEffect } from "react";

export function LoftCmd() {
  const { cmd, selectedHandles, doc, addEntity, finishCmd, selectOnly } =
    useStore();

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
        selectOnly(handleNew("LOFT", newLoft.id));
      }
    }
  }, [cmd, selectedHandles, doc, addEntity, finishCmd, selectOnly]);

  return null;
}
