"use client";

import { cn } from "@/lib/utils";
import { colors } from "@/components/colors";
import { fonts } from "../../fonts";

export function NoSelection() {
  return (
    <div className="flex h-full items-center justify-center">
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
