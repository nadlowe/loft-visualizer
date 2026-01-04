"use client";

import { parseHandle } from "@/lib/entity/handle";
import { EntityHandle } from "@/lib/entity/handleTypes";
import { Doc } from "@/lib/state/doc";
import { LoftId, PolylineId, WorkPlaneId } from "@/lib/util/uid";
import { LoftInspector } from "./LoftInspector";
import { PolylineInspector } from "./PolylineInspector";
import { WorkPlaneInspector } from "./WorkPlaneInspector";

interface SingleInspectorProps {
  doc: Doc;
  handle: EntityHandle;
}

export function SingleInspector({ doc, handle }: SingleInspectorProps) {
  const { type, id } = parseHandle(handle);

  switch (type) {
    case "WORKPLANE": {
      const entity = doc.workPlanes[id as WorkPlaneId];
      if (!entity) return null;
      return <WorkPlaneInspector entity={entity} handle={handle} />;
    }
    case "POLYLINE": {
      const entity = doc.polylines[id as PolylineId];
      if (!entity) return null;
      return <PolylineInspector entity={entity} handle={handle} />;
    }
    case "LOFT": {
      const entity = doc.lofts[id as LoftId];
      if (!entity) return null;
      return <LoftInspector entity={entity} handle={handle} />;
    }
    default:
      return null;
  }
}
