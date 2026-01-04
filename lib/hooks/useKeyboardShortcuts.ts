import { useStore } from "@/lib/state/useStore";
import { useEffect } from "react";

export function useKeyboardShortcuts() {
  const { cmd, startDrawPolyline, cancelCmd, removeLastVertex } = useStore();

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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cmd, startDrawPolyline, cancelCmd, removeLastVertex]);
}
