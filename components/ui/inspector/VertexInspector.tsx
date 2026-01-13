"use client";

import { colors } from "@/components/colors";
import { fonts } from "@/components/fonts";
import { VertexHandle } from "@/lib/entity/handleTypes";
import { useStore } from "@/store/useStore";

export function VertexInspector({ handle }: { handle: VertexHandle }) {
  const { doc } = useStore();
  const polyline = doc.polylines[handle.polylineId];

  if (!polyline) {
    return <div className={colors.text.secondary}>Polyline not found</div>;
  }

  const vertexCount = Math.floor(polyline.polyline.length / 2);

  return (
    <div className="flex items-center justify-between">
      <span className={`${fonts.size.xs} ${colors.text.secondary}`}>
        Vertex
      </span>
      <span className={fonts.size.sm}>
        {handle.vertexIndex + 1} of {vertexCount}
      </span>
    </div>
  );
}
