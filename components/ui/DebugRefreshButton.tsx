"use client";

import { colors } from "@/components/colors";
import { clearAllDebug } from "@/lib/debug/debugGeom";
import { useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";
import { RefreshIcon } from "./Icons";

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
        "z-10 flex w-[120px] items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all",
        "active:bg-blue-500",
        colors.bg.secondary,
        colors.text.primary,
        "hover:" + colors.bg.secondary
      )}
      title="Clear and regenerate debug geometry"
    >
      <RefreshIcon className="h-4 w-4" />
      Debug
    </button>
  );
}
