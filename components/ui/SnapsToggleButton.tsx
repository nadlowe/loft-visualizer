"use client";

import { colors } from "@/components/colors";
import { useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";

export function SnapsToggleButton() {
  const { snapEnabled, toggleSnap } = useStore();

  return (
    <button
      onClick={toggleSnap}
      className={cn(
        "z-10 rounded-md px-4 py-2 text-sm font-medium transition-all",
        snapEnabled ? "bg-blue-600 text-white" : colors.bg.secondary,
        !snapEnabled && colors.text.primary
      )}
    >
      Snaps
    </button>
  );
}
