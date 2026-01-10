"use client";

import { colors } from "@/components/colors";
import { useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";
import { usePanelResize } from "../usePanelResize";
import { InspectorHeader } from "./InspectorHeader";
import { MultiInspector } from "./MultiInspector";
import { NoSelection } from "./NoSelection";
import { SingleInspector } from "./SingleInspector";

interface InspectorProps {
  width: number;
  isCollapsed: boolean;
  onResize: (width: number) => void;
  onCollapse: (collapsed: boolean) => void;
}

export function Inspector({
  width,
  isCollapsed,
  onResize,
  onCollapse,
}: InspectorProps) {
  const { doc, selectedHandles } = useStore();
  const selectedArray = Array.from(selectedHandles);
  const selectedCount = selectedArray.length;

  const { handleMouseDown } = usePanelResize({
    width,
    isCollapsed,
    onResize,
    onCollapse,
    side: "left",
  });

  if (isCollapsed) {
    return (
      <div
        className={cn(
          "relative flex h-full border-l transition-all",
          colors.border.primary,
          colors.bg.primary
        )}
        style={{ width: "32px" }}
      >
        <div
          onMouseDown={handleMouseDown}
          className={`absolute top-0 left-0 h-full w-1 cursor-col-resize transition-colors ${colors.resize.hover}`}
        />
        <div className="flex-1 overflow-auto p-4"></div>
      </div>
    );
  }

  const singleHandle = selectedCount === 1 ? selectedArray[0] : null;

  return (
    <div
      className={cn(
        "relative flex h-full flex-col border-l transition-all",
        colors.border.primary,
        colors.bg.primary
      )}
      style={{ width: `${width}px` }}
    >
      <div
        onMouseDown={handleMouseDown}
        className={`absolute top-0 left-0 h-full w-1 cursor-col-resize transition-colors ${colors.resize.hover}`}
      />
      <div className="flex-1 overflow-auto p-4">
        {singleHandle && <InspectorHeader handle={singleHandle} />}
        <div className={cn(singleHandle && "mt-4")}>
          {selectedCount === 0 && <NoSelection />}
          {singleHandle && <SingleInspector handle={singleHandle} />}
          {selectedCount > 1 && (
            <MultiInspector doc={doc} handles={selectedArray} />
          )}
        </div>
      </div>
    </div>
  );
}
