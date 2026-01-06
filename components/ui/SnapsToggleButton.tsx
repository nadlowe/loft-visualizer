"use client";

import { useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";
import { colors } from "./colors";

export function SnapsToggleButton() {
  const { snapEnabled, toggleSnap } = useStore();

  return (
    <button
      onClick={toggleSnap}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        snapEnabled
          ? "bg-blue-500 text-white"
          : cn("bg-white/10 hover:bg-white/20", colors.text.primary)
      )}
    >
      Snaps
    </button>
  );
}
