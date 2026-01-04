import { useStore } from "@/lib/state/useStore";
import { useEffect } from "react";

export function useKeyboardShortcuts() {
  const { cmd, startDrawPolyline, cancelCmd, removeLastVertex, selectedHandles, deleteEntity, clearSelection } = useStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        if (!cmd) {
          startDrawPolyline();
        }
      } else if (e.key === "Escape" && cmd) {
        e.preventDefault();
        cancelCmd();
      } else if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "z" &&
        !e.shiftKey &&
        cmd?.type === "DRAW_POLYLINE"
      ) {
        e.preventDefault();
        removeLastVertex();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const selectedArray = Array.from(selectedHandles);
        if (selectedArray.length > 0) {
          e.preventDefault();
          selectedArray.forEach((handle) => {
            deleteEntity(handle);
          });
          clearSelection();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cmd, startDrawPolyline, cancelCmd, removeLastVertex, selectedHandles, deleteEntity, clearSelection]);
}
