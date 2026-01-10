import { useCallback } from "react";

interface UsePanelResizeProps {
  width: number;
  isCollapsed: boolean;
  onResize: (width: number) => void;
  onCollapse: (collapsed: boolean) => void;
  minWidth?: number;
  side: "left" | "right";
}

export function usePanelResize({
  width,
  isCollapsed,
  onResize,
  onCollapse,
  minWidth = 200,
  side,
}: UsePanelResizeProps) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = isCollapsed ? 32 : width;
      const wasCollapsed = isCollapsed;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startX;
        // Right side: expand to the right (+deltaX)
        // Left side: expand to the left (-deltaX)
        const newWidth =
          side === "right" ? startWidth + deltaX : startWidth - deltaX;

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
    },
    [width, isCollapsed, onResize, onCollapse, minWidth, side]
  );

  return { handleMouseDown };
}
