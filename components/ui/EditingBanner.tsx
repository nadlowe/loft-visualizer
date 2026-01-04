"use client";

import { useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";
import { colors } from "../colors";
import { fonts } from "../fonts";

export function EditingBanner() {
  const { cmd } = useStore();

  if (!cmd) {
    return null;
  }

  let message = "";
  if (cmd.type === "DRAW_POLYLINE") {
    message = "Drawing polyline...";
  } else if (cmd.type === "ADD_LOFT") {
    message = "Select two polylines to create a loft";
  }

  return (
    <div
      className={cn(
        "absolute top-0 right-0 left-0 z-40 flex h-12 items-center border-b px-4 shadow-sm",
        colors.border.primary,
        colors.bg.primary
      )}
    >
      <span className={cn(fonts.size.sm, colors.text.secondary)}>
        {message}
      </span>
    </div>
  );
}
