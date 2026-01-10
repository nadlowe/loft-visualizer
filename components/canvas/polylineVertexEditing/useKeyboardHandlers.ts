import type { PolylineHandle, VertexHandle } from "@/lib/entity/handleTypes";
import { PolylineEntity } from "@/lib/entity/polylineEntity";
import { useStore } from "@/lib/state/useStore";
import { PolylineId } from "@/lib/util/uid";
import { useEffect } from "react";

interface UseKeyboardHandlersProps {
  polylineId: PolylineId;
  polylineHandle: PolylineHandle;
  polyline: PolylineEntity | undefined;
  hasSelectedVertices: boolean;
  selectedVertexIndices: number[];
  updateEntity: ReturnType<typeof useStore.getState>["updateEntity"];
  setEditingPolylineId: (id: PolylineId | null) => void;
  clearSelection: () => void;
  select: ReturnType<typeof useStore.getState>["select"];
}

export function useKeyboardHandlers({
  polylineId,
  polylineHandle,
  polyline,
  hasSelectedVertices,
  selectedVertexIndices,
  updateEntity,
  setEditingPolylineId,
  clearSelection,
  select,
}: UseKeyboardHandlersProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (hasSelectedVertices) {
          clearSelection();
        } else {
          clearSelection();
          setEditingPolylineId(null);
        }
        return;
      }

      // Cmd+J to toggle close/weld polyline
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        if (!polyline) return;

        const vertexCount = Math.floor(polyline.polyline.length / 2);
        if (vertexCount < 2) return;

        if (polyline.closed) {
          updateEntity(polylineHandle, (entity) => ({
            ...entity,
            closed: false,
          }));
          return;
        }

        const firstX = polyline.polyline[0];
        const firstY = polyline.polyline[1];
        const lastX = polyline.polyline[(vertexCount - 1) * 2];
        const lastY = polyline.polyline[(vertexCount - 1) * 2 + 1];
        const alreadyOverlapping =
          Math.abs(firstX - lastX) < 0.001 && Math.abs(firstY - lastY) < 0.001;

        let newLastIdx: number;

        if (alreadyOverlapping) {
          updateEntity(polylineHandle, (entity) => ({
            ...entity,
            closed: true,
          }));
          newLastIdx = vertexCount - 1;
        } else {
          updateEntity(polylineHandle, (entity) => {
            const newPolyline = [...entity.polyline, firstX, firstY];
            return {
              ...entity,
              polyline: newPolyline,
              closed: true,
            };
          });
          newLastIdx = vertexCount;
        }

        const firstHandle: VertexHandle = {
          type: "VERTEX",
          polylineId,
          vertexIndex: 0,
        };
        const lastHandle: VertexHandle = {
          type: "VERTEX",
          polylineId,
          vertexIndex: newLastIdx,
        };
        clearSelection();
        select(firstHandle);
        select(lastHandle);
        return;
      }

      // Delete selected vertices
      if (e.key === "Delete" || e.key === "Backspace") {
        if (hasSelectedVertices && polyline) {
          e.preventDefault();

          const vertexCount = Math.floor(polyline.polyline.length / 2);
          const lastIdx = vertexCount - 1;

          if (polyline.closed) {
            // For closed polylines, treat first and last as the same vertex
            const indicesToDelete = new Set(selectedVertexIndices);
            if (indicesToDelete.has(0) || indicesToDelete.has(lastIdx)) {
              indicesToDelete.add(0);
              indicesToDelete.add(lastIdx);
            }

            // Count unique vertices (exclude duplicated last vertex)
            const uniqueCount = lastIdx; // vertices 0 to lastIdx-1 are unique
            const deletedCount = [...indicesToDelete].filter(
              (i) => i < lastIdx
            ).length;
            const remainingCount = uniqueCount - deletedCount;

            if (remainingCount >= 2) {
              // Find first non-deleted vertex to start from
              let newStartIdx = -1;
              for (let i = 0; i < lastIdx; i++) {
                if (!indicesToDelete.has(i)) {
                  newStartIdx = i;
                  break;
                }
              }

              if (newStartIdx >= 0) {
                // Build new polyline rotating to start from newStartIdx
                const newPolyline: number[] = [];
                for (let i = 0; i < lastIdx; i++) {
                  const srcIdx = (newStartIdx + i) % lastIdx;
                  if (!indicesToDelete.has(srcIdx)) {
                    newPolyline.push(
                      polyline.polyline[srcIdx * 2],
                      polyline.polyline[srcIdx * 2 + 1]
                    );
                  }
                }
                // Duplicate first vertex at end for closure
                newPolyline.push(newPolyline[0], newPolyline[1]);

                updateEntity(polylineHandle, (entity) => ({
                  ...entity,
                  polyline: newPolyline,
                  closed: true,
                }));
                clearSelection();
              }
            }
          } else {
            // For open polylines, just remove vertices in reverse order
            const sortedIndices = [...selectedVertexIndices].sort(
              (a, b) => b - a
            );

            if (vertexCount - sortedIndices.length >= 2) {
              const newPolyline = [...polyline.polyline];
              for (const idx of sortedIndices) {
                newPolyline.splice(idx * 2, 2);
              }
              updateEntity(polylineHandle, (entity) => ({
                ...entity,
                polyline: newPolyline,
              }));
              clearSelection();
            }
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    hasSelectedVertices,
    selectedVertexIndices,
    polyline,
    polylineId,
    polylineHandle,
    updateEntity,
    setEditingPolylineId,
    clearSelection,
    select,
  ]);
}
