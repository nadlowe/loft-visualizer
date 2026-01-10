"use client";

import { entityName } from "@/lib/entity/entityNew";
import { handleNew } from "@/lib/entity/handle";
import { WorkPlaneEntity } from "@/lib/entity/workPlaneEntity";
import { plane3New } from "@/lib/geom/plane3";
import { useStore } from "@/lib/state/useStore";
import { uid, WorkPlaneId } from "@/lib/util/uid";
import { cn } from "@/lib/utils";
import { colors } from "../../colors";
import { EntityMenu } from "./EntityMenu";

interface ExplorerProps {
  width: number;
  isCollapsed: boolean;
  onResize: (width: number) => void;
  onCollapse: (collapsed: boolean) => void;
}

export function Explorer({
  width,
  isCollapsed,
  onResize,
  onCollapse,
}: ExplorerProps) {
  const { doc, addEntity, startDrawPolyline, startAddLoft, selectOnly } =
    useStore();

  const minWidth = 200;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = isCollapsed ? 32 : width;
    const wasCollapsed = isCollapsed;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = startWidth + deltaX;

      if (wasCollapsed) {
        if (newWidth >= minWidth) {
          onCollapse(false);
          onResize(newWidth);
        }
      } else {
        if (newWidth < minWidth) {
          onCollapse(true);
        } else {
          onResize(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleAddWorkPlane = () => {
    const workPlaneId = uid<WorkPlaneId>();
    const newWorkPlane: WorkPlaneEntity = {
      id: workPlaneId,
      type: "WORKPLANE",
      name: entityName(doc, "WORKPLANE"),
      plane3: plane3New([0, 0, 0], [0, 0, 1]),
    };
    addEntity(newWorkPlane);
    selectOnly(handleNew("WORKPLANE", workPlaneId));
  };

  return (
    <div
      className={cn(
        "relative flex h-full flex-col border-r transition-all",
        colors.border.primary,
        colors.bg.primary
      )}
      style={{ width: isCollapsed ? "32px" : `${width}px` }}
    >
      <div className="flex-1 overflow-auto p-4">
        <div className="flex flex-col">
          <EntityMenu
            doc={doc}
            entityType="WORKPLANE"
            onAdd={handleAddWorkPlane}
          />
          <EntityMenu
            doc={doc}
            entityType="POLYLINE"
            onAdd={startDrawPolyline}
          />
          <EntityMenu doc={doc} entityType="LOFT" onAdd={startAddLoft} />
        </div>
      </div>
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 right-0 h-full w-1 cursor-col-resize transition-colors hover:bg-blue-500"
      />
    </div>
  );
}
