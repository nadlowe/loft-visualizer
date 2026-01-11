"use client";

import { colors } from "@/components/colors";
import { clearAllDebug } from "@/lib/debug/debugGeom";
import { useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";

export function DebugRefreshButton() {
  const { forceRender } = useStore();

  const handleClick = () => {
    clearAllDebug();
    forceRender();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "z-10 rounded-md px-4 py-2 text-sm font-medium transition-all",
        colors.bg.secondary,
        colors.text.primary,
        "hover:" + colors.bg.secondary
      )}
      title="Clear and regenerate debug geometry"
    >
      🔄 Debug
    </button>
  );
}
