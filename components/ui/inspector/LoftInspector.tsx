"use client";

import { colors } from "@/components/colors";
import { fonts } from "@/components/fonts";
import { LoftHandle } from "@/lib/entity/handleTypes";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";

export function LoftInspector({ handle }: { handle: LoftHandle }) {
  const { doc, updateEntity } = useStore();
  const loft = doc.lofts[handle.id];

  if (!loft) return null;

  const polyline1 = doc.polylines[loft.polyline1];
  const polyline2 = doc.polylines[loft.polyline2];
  const polyline1Name = polyline1?.name || "—";
  const polyline2Name = polyline2?.name || "—";

  // Get vertex counts for dropdown options (1-based display)
  // If the polyline is closed, exclude the last vertex which is a duplicate of the first
  const count1 = polyline1 ? Math.floor(polyline1.polyline.length / 2) : 0;
  const vertexCount1 = polyline1?.closed && count1 > 0 ? count1 - 1 : count1;

  const count2 = polyline2 ? Math.floor(polyline2.polyline.length / 2) : 0;
  const vertexCount2 = polyline2?.closed && count2 > 0 ? count2 - 1 : count2;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={cn(fonts.size.xs, colors.text.secondary)}>
          Polyline 1
        </span>
        <span className={cn(fonts.size.xs, colors.text.primary)}>
          {polyline1Name}
        </span>
      </div>
      <SeamIndexDropdown
        label="Seam Index 1"
        value={loft.seamIndexA}
        maxIndex={vertexCount1}
        onChange={(value) =>
          updateEntity(handle, (entity) => ({
            ...entity,
            seamIndexA: value,
          }))
        }
      />
      <div className="flex items-center justify-between">
        <span className={cn(fonts.size.xs, colors.text.secondary)}>
          Polyline 2
        </span>
        <span className={cn(fonts.size.xs, colors.text.primary)}>
          {polyline2Name}
        </span>
      </div>
      <SeamIndexDropdown
        label="Seam Index 2"
        value={loft.seamIndexB}
        maxIndex={vertexCount2}
        onChange={(value) =>
          updateEntity(handle, (entity) => ({
            ...entity,
            seamIndexB: value,
          }))
        }
      />
    </div>
  );
}

function SeamIndexDropdown({
  label,
  value,
  maxIndex,
  onChange,
}: {
  label: string;
  value: number;
  maxIndex: number;
  onChange: (value: number) => void;
}) {
  const options = Array.from({ length: maxIndex }, (_, i) => i);

  return (
    <div className="flex items-center justify-between">
      <span className={cn(fonts.size.xs, colors.text.secondary)}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "rounded border px-2 py-0.5",
          fonts.size.xs,
          colors.bg.secondary,
          colors.border.primary,
          colors.text.primary
        )}
      >
        {options.map((idx) => (
          <option key={idx} value={idx}>
            {idx + 1}
          </option>
        ))}
      </select>
    </div>
  );
}
