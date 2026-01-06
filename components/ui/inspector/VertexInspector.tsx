"use client";

import { VertexHandle } from "@/lib/entity/handleTypes";
import { useStore } from "@/lib/state/useStore";

export function VertexInspector({ handle }: { handle: VertexHandle }) {
  const { doc } = useStore();
  const polyline = doc.polylines[handle.polylineId];

  if (!polyline) {
    return <div className="text-gray-400">Polyline not found</div>;
  }

  const vertexCount = Math.floor(polyline.polyline.length / 2);

  return (
    <div>
      <div className="text-xs text-gray-400">Vertex</div>
      <div className="mt-1 text-sm">
        {handle.vertexIndex + 1} of {vertexCount}
      </div>
    </div>
  );
}
