"use client";

import { colors } from "@/components/colors";
import { cn } from "@/lib/utils";

interface ModeToggleButtonProps {
  is2D: boolean;
  onToggle: () => void;
}

export function ModeToggleButton({ is2D, onToggle }: ModeToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "z-10 rounded-md px-4 py-2 text-sm font-medium transition-all",
        colors.bg.secondary,
        colors.text.primary,
        "hover:" + colors.bg.secondary
      )}
    >
      {is2D ? "Switch to 3D" : "Switch to 2D"}
    </button>
  );
}
