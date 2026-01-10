"use client";

import { colors } from "@/components/colors";
import { VertexHandle } from "@/lib/entity/handleTypes";
import { useStore } from "@/lib/state/useStore";

export function VertexInspector({ handle }: { handle: VertexHandle }) {
  const { doc } = useStore();
  const polyline = doc.polylines[handle.polylineId];

  if (!polyline) {
    return <div className={colors.text.secondary}>Polyline not found</div>;
  }

  const vertexCount = Math.floor(polyline.polyline.length / 2);

  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${colors.text.secondary}`}>Vertex</span>
      <span className="text-sm">
        {handle.vertexIndex + 1} of {vertexCount}
      </span>
    </div>
  );
}
