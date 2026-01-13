"use client";

import { plane3ToWorkPlane } from "@/components/canvas/render/renderWorkPlane";
import { colors } from "@/components/colors";
import { fonts } from "@/components/fonts";
import { workPlaneToPlane3 } from "@/lib/conversion/threeToGeom";
import { WorkPlaneHandle } from "@/lib/entity/handleTypes";
import { plane3New } from "@/lib/geom/plane3";
import { degToRad, radToDeg } from "@/lib/geom/scalar";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useEffect, useMemo, useState } from "react";

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
      <span className={cn(fonts.size.xs, colors.text.secondary)}>{label}</span>
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

  const rotation = useMemo(() => {
    if (!workPlane) return { x: 0, y: 0, z: 0 };
    const group = plane3ToWorkPlane(workPlane.plane3);
    return {
      x: radToDeg(group.rotation.x),
      y: radToDeg(group.rotation.y),
      z: radToDeg(group.rotation.z),
    };
  }, [workPlane]);

  if (!workPlane) return null;

  const { origin } = workPlane.plane3;
  const round = (val: number) => Math.round(val * 100) / 100;

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

  const handleRotationChange = (axis: "x" | "y" | "z", degrees: number) => {
    updateEntity(handle, (entity) => {
      const group = plane3ToWorkPlane(entity.plane3);
      group.rotation[axis] = degToRad(degrees);
      group.updateMatrixWorld(true);
      const newPlane3 = workPlaneToPlane3(group);
      return {
        ...entity,
        plane3: newPlane3,
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
      <div className="flex flex-col gap-2">
        <span className={cn(fonts.size.xs, colors.text.secondary, "font-bold")}>
          Position
        </span>
        <NumberInput
          label="X"
          value={round(origin[0])}
          onCommit={(v) => handleOriginChange(0, v)}
        />
        <NumberInput
          label="Y"
          value={round(origin[1])}
          onCommit={(v) => handleOriginChange(1, v)}
        />
        <NumberInput
          label="Z"
          value={round(origin[2])}
          onCommit={(v) => handleOriginChange(2, v)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className={cn(fonts.size.xs, colors.text.secondary, "font-bold")}>
          Rotation (deg)
        </span>
        <NumberInput
          label="Rot X"
          value={round(rotation.x)}
          onCommit={(v) => handleRotationChange("x", v)}
        />
        <NumberInput
          label="Rot Y"
          value={round(rotation.y)}
          onCommit={(v) => handleRotationChange("y", v)}
        />
        <NumberInput
          label="Rot Z"
          value={round(rotation.z)}
          onCommit={(v) => handleRotationChange("z", v)}
        />
      </div>

      <button
        onClick={handleClearRotation}
        className={cn(
          "mt-1 rounded border px-3 py-1.5 text-xs transition-all",
          colors.border.primary,
          colors.text.secondary,
          "hover:" + colors.bg.secondary,
          "active:scale-95 active:border-blue-500 active:bg-blue-500"
        )}
      >
        Clear Rotation
      </button>
    </div>
  );
}
