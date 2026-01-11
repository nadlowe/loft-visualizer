"use client";

import { colors } from "@/components/colors";
import { workPlaneNew } from "@/lib/entity/entityTools/entityNew";
import { entityName } from "@/lib/entity/entityTools/entityTypeToName";
import { plane3New } from "@/lib/geom/plane3";
import { useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { usePanelResize } from "../usePanelResize";
import { AddOption, EntityMenu } from "./EntityMenu";

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
  const { doc, addEntity, startDrawPolyline, startAddLoft } = useStore();

  const { handleMouseDown } = usePanelResize({
    width,
    isCollapsed,
    onResize,
    onCollapse,
    side: "right",
  });

  const handleAddWorkPlane = () => {
    const newWorkPlane = workPlaneNew(
      plane3New([0, 0, 0], [0, 0, 1]),
      entityName(doc, "WORKPLANE")
    );
    addEntity(newWorkPlane);
  };

  const loftAddOptions: AddOption[] = useMemo(
    () => [
      { label: "Simple", onClick: () => startAddLoft("SIMPLE") },
      { label: "Seam", onClick: () => startAddLoft("SEAM") },
    ],
    [startAddLoft]
  );

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden border-r transition-all",
        colors.border.primary,
        colors.bg.primary
      )}
      style={{ width: isCollapsed ? "32px" : `${width}px` }}
    >
      {!isCollapsed && (
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
            <EntityMenu doc={doc} entityType="LOFT" addOptions={loftAddOptions} />
          </div>
        </div>
      )}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute top-0 right-0 h-full w-1 cursor-col-resize transition-colors ${colors.resize.hover}`}
      />
    </div>
  );
}
