"use client";

import { colors } from "@/components/colors";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { fonts } from "../fonts";

export function EditingBanner() {
  const { cmd, setCloseLoop, setPolylineClosedPref } = useStore();

  if (!cmd) {
    return null;
  }

  let message = "";
  let showCloseToggle = false;
  let closeLoop = false;

  if (cmd.type === "DRAW_POLYLINE") {
    message = "Drawing polyline...";
    showCloseToggle = cmd.vertices.length >= 2;
    closeLoop = cmd.closeLoop;
  } else if (cmd.type === "ADD_LOFT") {
    message = "Select two polylines to create a loft";
  }

  const handleToggle = () => {
    const newValue = !closeLoop;
    setCloseLoop(newValue);
    setPolylineClosedPref(newValue);
  };

  return (
    <div
      className={cn(
        "absolute top-0 right-0 left-0 z-40 flex h-12 items-center justify-between border-b px-4 shadow-sm",
        colors.border.primary,
        colors.bg.primary
      )}
    >
      <span className={cn(fonts.size.sm, colors.text.secondary)}>
        {message}
      </span>
      {showCloseToggle && (
        <label className="flex cursor-pointer items-center gap-2">
          <span className={cn(fonts.size.sm, colors.text.secondary)}>
            Closed
          </span>
          <button
            onClick={handleToggle}
            className={cn(
              "relative h-5 w-9 rounded-full transition-colors",
              closeLoop ? colors.toggle.on : colors.toggle.off
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                closeLoop ? "left-[18px]" : "left-0.5"
              )}
            />
          </button>
        </label>
      )}
    </div>
  );
}
