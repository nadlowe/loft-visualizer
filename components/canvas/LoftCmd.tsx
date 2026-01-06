"use client";

import { handleNew } from "@/lib/entity/handle";
import { LoftEntity } from "@/lib/entity/loftEntity";
import { useStore } from "@/lib/state/useStore";
import { LoftId, PolylineId, uid } from "@/lib/util/uid";
import { useEffect } from "react";

export function LoftCmd() {
  const { cmd, selectedHandles, doc, addLoft, finishAddLoft, selectOnly } =
    useStore();

  useEffect(() => {
    if (cmd?.type === "ADD_LOFT") {
      const selectedArray = Array.from(selectedHandles);

      // Filter to only POLYLINE handles
      const polylineHandles = selectedArray.filter((handle) => {
        return handle.type === "POLYLINE";
      });

      if (polylineHandles.length === 2) {
        const loftId = uid<LoftId>();
        const loftCount = Object.keys(doc.lofts).length;
        const newLoft: LoftEntity = {
          id: loftId,
          type: "LOFT",
          name: `Loft ${loftCount + 1}`,
          polyline1: polylineHandles[0].id as PolylineId,
          polyline2: polylineHandles[1].id as PolylineId,
        };

        addLoft(newLoft);
        finishAddLoft();
        const handle = handleNew("LOFT", loftId);
        selectOnly(handle);
      }
    }
  }, [cmd, selectedHandles, doc, addLoft, finishAddLoft, selectOnly]);

  return null;
}
