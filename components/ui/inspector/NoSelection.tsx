"use client";

import { cn } from "@/lib/utils";
import { colors } from "../../colors";
import { fonts } from "../../fonts";

export function NoSelection() {
  return (
    <div className="flex items-center justify-center h-full">
      <span
        className={cn(
          fonts.weight.normal,
          fonts.size.sm,
          colors.text.secondary
        )}
      >
        No Selection
      </span>
    </div>
  );
}
