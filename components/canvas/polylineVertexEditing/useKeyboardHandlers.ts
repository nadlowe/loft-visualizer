import type { PolylineHandle, VertexHandle } from "@/lib/entity/handleTypes";
import { PolylineEntity } from "@/lib/entity/polylineEntity";
import { DIST_EPSILON } from "@/lib/geom/scalar";
import { PolylineId } from "@/lib/util/uid";
import { useStore } from "@/store/useStore";
import { useEffect } from "react";

interface UseKeyboardHandlersProps {
  polylineId: PolylineId;
  polylineHandle: PolylineHandle;
  polyline: PolylineEntity | undefined;
  hasSelectedVertices: boolean;
  selectedVertexIndices: number[];
  updateEntity: ReturnType<typeof useStore.getState>["updateEntity"];
  updatePolylineVertices: ReturnType<
    typeof useStore.getState
  >["updatePolylineVertices"];
  setEditingPolylineId: (id: PolylineId | null) => void;
  clearSelection: () => void;
  selectOnly: ReturnType<typeof useStore.getState>["selectOnly"];
  select: ReturnType<typeof useStore.getState>["select"];
}

export function useKeyboardHandlers({
  polylineId,
  polylineHandle,
  polyline,
  hasSelectedVertices,
  selectedVertexIndices,
  updateEntity,
  updatePolylineVertices,
  setEditingPolylineId,
  clearSelection,
  selectOnly,
  select,
}: UseKeyboardHandlersProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (hasSelectedVertices) {
          selectOnly(polylineHandle);
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
          Math.abs(firstX - lastX) < DIST_EPSILON &&
          Math.abs(firstY - lastY) < DIST_EPSILON;

        let newLastIdx: number;

        if (alreadyOverlapping) {
          updateEntity(polylineHandle, (entity) => ({
            ...entity,
            closed: true,
          }));
          newLastIdx = vertexCount - 1;
        } else {
          // This is technically an "ADD" of a vertex at the end, but it's a special case
          // where we duplicate the first vertex. For now, let's keep it as updateEntity
          // but we might want to reconsider if it affects the seam logic.
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

                // We need to notify the store about the deletions for seam adjustment
                const deletedIndices = Array.from(indicesToDelete).filter(
                  (i) => i < lastIdx
                );
                updatePolylineVertices(polylineId, newPolyline, {
                  type: "DELETE",
                  indices: deletedIndices,
                });
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
              updatePolylineVertices(polylineId, newPolyline, {
                type: "DELETE",
                indices: sortedIndices,
              });
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
    updatePolylineVertices,
    setEditingPolylineId,
    clearSelection,
    selectOnly,
    select,
  ]);
}
