"use client";

import { SelectableHandle } from "@/lib/entity/handleTypes";
import { LoftInspector } from "./LoftInspector";
import { PolylineInspector } from "./PolylineInspector";
import { VertexInspector } from "./VertexInspector";
import { WorkPlaneInspector } from "./WorkPlaneInspector";

export function SingleInspector({ handle }: { handle: SelectableHandle }) {
  switch (handle.type) {
    case "WORKPLANE":
      return <WorkPlaneInspector handle={handle} />;
    case "POLYLINE":
      return <PolylineInspector handle={handle} />;
    case "LOFT":
      return <LoftInspector handle={handle} />;
    case "VERTEX":
      return <VertexInspector handle={handle} />;
  }
}
