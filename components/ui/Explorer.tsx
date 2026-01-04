"use client";

import { cn } from "@/lib/utils";
import { colors } from "../colors";

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

  if (isCollapsed) {
    return (
      <div
        className={cn(
          "relative flex h-full border-r transition-all",
          colors.border.primary,
          colors.bg.primary
        )}
        style={{ width: "32px" }}
      >
        <div className="flex-1 overflow-auto p-4">
          {/* Empty for now */}
        </div>
        <div
          onMouseDown={handleMouseDown}
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-blue-500"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-full flex-col border-r transition-all",
        colors.border.primary,
        colors.bg.primary
      )}
      style={{ width: `${width}px` }}
    >
      <div className="flex-1 overflow-auto p-4">
        {/* Empty for now */}
      </div>
      <div
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-blue-500"
      />
    </div>
  );
}
