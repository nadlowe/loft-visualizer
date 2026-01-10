"use client";

import { cn } from "@/lib/utils";
import { colors } from "../colors";

interface ShiftInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function ShiftInput({ label, value, onChange }: ShiftInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = parseInt(e.target.value, 10);
    if (!isNaN(numValue)) {
      onChange(numValue);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-xs", colors.text.secondary)}>{label}</span>
      <input
        type="number"
        value={value}
        onChange={handleChange}
        className={cn(
          "w-20 rounded border bg-gray-800 px-2 py-1 text-sm outline-none",
          colors.border.primary,
          colors.text.primary,
          "focus:border-blue-500"
        )}
      />
    </div>
  );
}
