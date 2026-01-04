"use client";

import { useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";
import { colors } from "../../colors";
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

  const minWidth = 200;
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = isCollapsed ? 32 : width;
    const wasCollapsed = isCollapsed;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = startWidth - deltaX;

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
          className="absolute top-0 left-0 h-full w-1 cursor-col-resize transition-colors hover:bg-blue-500"
        />
        <div className="flex-1 overflow-auto p-4"></div>
      </div>
    );
  }

  let content = null;
  if (selectedCount === 0) {
    content = <NoSelection />;
  } else if (selectedCount === 1) {
    content = <SingleInspector doc={doc} handle={selectedArray[0]} />;
  } else {
    content = <MultiInspector doc={doc} handles={selectedArray} />;
  }

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
        className="absolute top-0 left-0 h-full w-1 cursor-col-resize transition-colors hover:bg-blue-500"
      />
      <div className="flex-1 overflow-auto p-4">{content}</div>
    </div>
  );
}
