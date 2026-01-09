import { LoftIcon, PolylineIcon, WorkPlaneIcon } from "@/components/ui/Icons";
import { EntityType } from "./entityTypes";

export const entityTypeToIcon: Record<
  EntityType,
  React.ComponentType<{ className?: string }>
> = {
  WORKPLANE: WorkPlaneIcon,
  POLYLINE: PolylineIcon,
  LOFT: LoftIcon,
};
