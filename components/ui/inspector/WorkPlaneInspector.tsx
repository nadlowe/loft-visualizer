"use client";

import { WorkPlaneHandle } from "@/lib/entity/handleTypes";
import { plane3New } from "@/lib/geom/plane3";
import { useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { colors } from "@/components/colors";

function NumberInput({
  value,
  onCommit,
  label,
}: {
  value: number;
  onCommit: (value: number) => void;
  label: string;
}) {
  const [localValue, setLocalValue] = useState(String(value));

  // Sync local value when external value changes
  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const commit = () => {
    const numValue = parseFloat(localValue);
    if (!isNaN(numValue) && numValue !== value) {
      onCommit(numValue);
    } else {
      setLocalValue(String(value));
    }
  };

  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-xs", colors.text.secondary)}>{label}</span>
      <input
        type="number"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            (e.target as HTMLInputElement).blur();
          }
        }}
        onBlur={commit}
        className={cn(
          "w-24 rounded border bg-gray-800 px-2 py-1 text-right text-sm outline-none",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          colors.border.primary,
          colors.text.primary,
          "focus:border-blue-500"
        )}
      />
    </div>
  );
}

export function WorkPlaneInspector({ handle }: { handle: WorkPlaneHandle }) {
  const { doc, updateEntity } = useStore();
  const workPlane = doc.workPlanes[handle.id];

  if (!workPlane) return null;

  const { origin } = workPlane.plane3;

  const handleOriginChange = (axis: 0 | 1 | 2, value: number) => {
    updateEntity(handle, (entity) => {
      const newOrigin = [...entity.plane3.origin] as [number, number, number];
      newOrigin[axis] = value;
      return {
        ...entity,
        plane3: {
          ...entity.plane3,
          origin: newOrigin,
        },
      };
    });
  };

  const handleClearRotation = () => {
    updateEntity(handle, (entity) => ({
      ...entity,
      plane3: plane3New(entity.plane3.origin, [0, 0, 1]),
    }));
  };

  return (
    <div className="flex flex-col gap-3">
      <NumberInput
        label="X"
        value={origin[0]}
        onCommit={(v) => handleOriginChange(0, v)}
      />
      <NumberInput
        label="Y"
        value={origin[1]}
        onCommit={(v) => handleOriginChange(1, v)}
      />
      <NumberInput
        label="Z"
        value={origin[2]}
        onCommit={(v) => handleOriginChange(2, v)}
      />
      <button
        onClick={handleClearRotation}
        className={cn(
          "mt-1 rounded border px-3 py-1.5 text-xs transition-all",
          colors.border.primary,
          colors.text.secondary,
          "hover:" + colors.bg.secondary,
          "active:scale-95 active:border-blue-500 active:bg-blue-600"
        )}
      >
        Clear Rotation
      </button>
    </div>
  );
}
