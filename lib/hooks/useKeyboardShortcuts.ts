import { PolylineEntity } from "@/lib/entity/polylineEntity";
import { useStore } from "@/lib/state/useStore";
import { PolylineId } from "@/lib/util/uid";
import { useEffect } from "react";
import { mergePolylineVerticesWithIndices } from "../geom/utils";

export function useKeyboardShortcuts() {
  const {
    cmd,
    startDrawPolyline,
    cancelCmd,
    removeLastVertex,
    selectedHandles,
    deleteEntity: removeEntity,
    duplicateEntity,
    deepDuplicateEntity,
    clearSelection,
    undo,
    redo,
    editingPolylineId,
    doc,
    updateEntity,
    updatePolylineVertices,
  } = useStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        if (!cmd) {
          startDrawPolyline();
        }
      } else if (e.key === "Escape") {
        if (cmd) {
          e.preventDefault();
          cancelCmd();
        } else if (selectedHandles.size > 0) {
          e.preventDefault();
          clearSelection();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (cmd?.type === "DRAW_POLYLINE") {
          removeLastVertex();
        } else {
          undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        // Cmd+D to duplicate, Cmd+Shift+D to deep duplicate
        e.preventDefault();

        // Filter out vertex handles - only duplicate actual entities
        const selectedArray = Array.from(selectedHandles).filter(
          (handle) => handle.type !== "VERTEX"
        );
        if (selectedArray.length === 0) return;

        for (const handle of selectedArray) {
          if (e.shiftKey) {
            deepDuplicateEntity(handle);
          } else {
            duplicateEntity(handle);
          }
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        // Cmd+J to toggle close/weld polyline - only when not in vertex editing mode
        if (editingPolylineId) return; // Let vertex editing handle it

        // Find selected polyline
        const selectedPolyline = Array.from(selectedHandles).find(
          (handle) => handle.type === "POLYLINE"
        );
        if (!selectedPolyline || selectedPolyline.type !== "POLYLINE") return;

        const polylineId = selectedPolyline.id;
        const polyline = doc.polylines[polylineId];
        if (!polyline) return;

        e.preventDefault();

        const vertexCount = Math.floor(polyline.polyline.length / 2);
        if (vertexCount < 2) return;

        // If already closed, unjoin (toggle off)
        if (polyline.closed) {
          updateEntity(selectedPolyline, (entity) => ({
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

        if (alreadyOverlapping) {
          updateEntity(selectedPolyline, (entity) => ({
            ...entity,
            closed: true,
          }));
        } else {
          updateEntity(selectedPolyline, (e) => {
            const entity = e as PolylineEntity;
            return {
              ...entity,
              polyline: [...entity.polyline, firstX, firstY],
              closed: true,
            };
          });
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === "m") {
        // Cmd+M to merge overlapping vertices
        // Collect polyline IDs from either vertex editing, vertex selection, or polyline selection
        const polylineIds = new Set<PolylineId>();

        // If in vertex editing mode, use that polyline
        if (editingPolylineId) {
          polylineIds.add(editingPolylineId);
        }

        // Check selected handles for polylines or vertices
        for (const handle of selectedHandles) {
          if (handle.type === "POLYLINE") {
            polylineIds.add(handle.id);
          } else if (handle.type === "VERTEX") {
            polylineIds.add(handle.polylineId);
          }
        }

        if (polylineIds.size === 0) return;

        e.preventDefault();

        for (const polylineId of polylineIds) {
          const polyline = doc.polylines[polylineId];
          if (!polyline) continue;

          const { polyline: mergedPolyline, deletedIndices } =
            mergePolylineVerticesWithIndices(polyline.polyline);

          // Only update if vertices were actually merged
          if (deletedIndices.length > 0) {
            updatePolylineVertices(polylineId, mergedPolyline, {
              type: "DELETE",
              indices: deletedIndices,
            });
          }
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        // Don't delete entities if user is editing text (e.g., entity name)
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return; // Let the browser handle delete/backspace for text editing
        }

        // Don't delete entities if user is editing polyline vertices
        if (editingPolylineId) {
          return; // Let the vertex editing component handle delete
        }

        // Filter out vertex handles - only delete actual entities
        const selectedArray = Array.from(selectedHandles).filter(
          (handle) => handle.type !== "VERTEX"
        );
        if (selectedArray.length > 0) {
          e.preventDefault();
          selectedArray.forEach((handle) => {
            removeEntity(handle);
          });
          clearSelection();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    cmd,
    startDrawPolyline,
    cancelCmd,
    removeLastVertex,
    selectedHandles,
    removeEntity,
    duplicateEntity,
    deepDuplicateEntity,
    clearSelection,
    undo,
    redo,
    editingPolylineId,
    doc.polylines,
    updateEntity,
  ]);
}
