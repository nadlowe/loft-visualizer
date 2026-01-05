import { useStore } from "@/lib/state/useStore";
import { useEffect } from "react";

export function useKeyboardShortcuts() {
  const {
    cmd,
    startDrawPolyline,
    cancelCmd,
    removeLastVertex,
    selectedHandles,
    deleteEntity,
    clearSelection,
    undo,
    redo,
  } = useStore();

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
      } else if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (cmd?.type === "DRAW_POLYLINE") {
          removeLastVertex();
        } else {
          undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        // Don't delete entities if user is editing text (e.g., entity name)
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return; // Let the browser handle delete/backspace for text editing
        }

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
  }, [
    cmd,
    startDrawPolyline,
    cancelCmd,
    removeLastVertex,
    selectedHandles,
    deleteEntity,
    clearSelection,
    undo,
    redo,
  ]);
}
