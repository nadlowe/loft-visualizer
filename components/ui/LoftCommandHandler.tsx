"use client";

import { handleNew, parseHandle } from "@/lib/entity/handle";
import { LoftEntity } from "@/lib/entity/loftEntity";
import { useStore } from "@/lib/state/useStore";
import { LoftId, PolylineId, uid } from "@/lib/util/uid";
import { useEffect } from "react";

export function LoftCommandHandler() {
  const { cmd, selectedHandles, doc, addLoft, finishAddLoft, selectOnly } =
    useStore();

  useEffect(() => {
    if (cmd?.type === "ADD_LOFT") {
      const selectedArray = Array.from(selectedHandles);

      // Filter to only POLYLINE handles
      const polylineHandles = selectedArray.filter((handle) => {
        const { type } = parseHandle(handle);
        return type === "POLYLINE";
      });

      if (polylineHandles.length === 2) {
        const { id: id1 } = parseHandle(polylineHandles[0]);
        const { id: id2 } = parseHandle(polylineHandles[1]);

        const loftId = uid<LoftId>();
        const loftCount = Object.keys(doc.lofts).length;
        const newLoft: LoftEntity = {
          id: loftId,
          type: "LOFT",
          name: `Loft ${loftCount + 1}`,
          polyline1: id1 as PolylineId,
          polyline2: id2 as PolylineId,
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
