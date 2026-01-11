"use client";

import { colors } from "@/components/colors";
import { GridSnapMode, useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";

const MODE_LABELS: Record<GridSnapMode, string> = {
  OFF: "Grid: Off",
  INCH: "Grid: Inches",
  FOOT: "Grid: Feet",
  "10_FEET": "Grid: 10 Feet",
};

export function GridSnapButton() {
  const { gridSnapMode, cycleGridSnap } = useStore();

  return (
    <button
      onClick={cycleGridSnap}
      className={cn(
        "z-10 w-[120px] rounded-md px-4 py-2 text-sm font-medium transition-all",
        "active:bg-blue-500",
        colors.bg.secondary,
        colors.text.primary,
        "hover:" + colors.bg.secondary
      )}
    >
      {MODE_LABELS[gridSnapMode]}
    </button>
  );
}
