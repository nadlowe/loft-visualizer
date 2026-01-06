"use client";

import {
  LoftHandle,
  PolylineHandle,
  WorkPlaneHandle,
} from "@/lib/entity/handleTypes";
import { LoftInspector } from "./LoftInspector";
import { PolylineInspector } from "./PolylineInspector";
import { WorkPlaneInspector } from "./WorkPlaneInspector";

export function SingleInspector({
  handle,
}: {
  handle: WorkPlaneHandle | PolylineHandle | LoftHandle;
}) {
  switch (handle.type) {
    case "WORKPLANE":
      return <WorkPlaneInspector handle={handle} />;
    case "POLYLINE":
      return <PolylineInspector handle={handle} />;
    case "LOFT":
      return <LoftInspector handle={handle} />;
  }
}
