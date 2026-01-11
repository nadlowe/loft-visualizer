"use client";

import { loftNew } from "@/lib/entity/entityTools/entityNew";
import { entityName } from "@/lib/entity/entityTools/entityTypeToName";
import { projectPolyline2ToPlane3 } from "@/lib/geom/project";
import { determineLoftSeam, getPolylinePlane } from "@/lib/geom/utils";
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
        const pl1Id = polylineHandles[0].id as PolylineId;
        const pl2Id = polylineHandles[1].id as PolylineId;

        let seamIndexA = 0;
        let seamIndexB = 0;

        if (cmd.loftType === "BEST_SEAM") {
          const docPl1 = doc.polylines[pl1Id];
          const docPl2 = doc.polylines[pl2Id];

          const plane1 = getPolylinePlane(docPl1, doc);
          const plane2 = getPolylinePlane(docPl2, doc);

          const { pl3: pl3A, pl2: pl2A } = projectPolyline2ToPlane3(
            docPl1.polyline,
            plane1,
            docPl1.closed
          );
          const { pl3: pl3B, pl2: pl2B } = projectPolyline2ToPlane3(
            docPl2.polyline,
            plane2,
            docPl2.closed
          );

          const seam = determineLoftSeam(
            pl2A,
            plane1,
            pl3A,
            pl2B,
            plane2,
            pl3B
          );
          seamIndexA = seam.seamIndexA;
          seamIndexB = seam.seamIndexB;
        }

        const newLoft = loftNew(pl1Id, pl2Id, name, seamIndexA, seamIndexB);
        addEntity(newLoft);
        finishCmd();
      }
    }
  }, [cmd, selectedHandles, doc, addEntity, finishCmd]);

  return null;
}
