import { PolylineEntity } from "@/lib/entity/polylineEntity";
import { DIST_EPSILON } from "@/lib/geom/scalar";
import { mergePolylineVerticesWithIndices } from "@/lib/geom/utils";
import { PolylineId } from "@/lib/util/uid";
import { useStore } from "@/store/useStore";
import { useCallback, useMemo } from "react";

interface Shortcut {
  id: string;
  name: string;
  keyCombo: string;
  match: (e: KeyboardEvent) => boolean;
  action: (e?: KeyboardEvent) => void;
  hide?: boolean;
}

export function useShortcuts() {
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

  const handleDuplicate = useCallback(
    (deep?: boolean) => {
      const selectedArray = Array.from(selectedHandles).filter(
        (handle) => handle.type !== "VERTEX"
      );
      if (selectedArray.length === 0) return;

      for (const handle of selectedArray) {
        if (deep) {
          deepDuplicateEntity(handle);
        } else {
          duplicateEntity(handle);
        }
      }
    },
    [selectedHandles, deepDuplicateEntity, duplicateEntity]
  );

  const handleToggleClose = useCallback(
    (e?: KeyboardEvent) => {
      if (editingPolylineId) return;

      const selectedPolyline = Array.from(selectedHandles).find(
        (handle) => handle.type === "POLYLINE"
      );
      if (!selectedPolyline || selectedPolyline.type !== "POLYLINE") return;

      const polylineId = selectedPolyline.id;
      const polyline = doc.polylines[polylineId];
      if (!polyline) return;

      e?.preventDefault();

      const vertexCount = Math.floor(polyline.polyline.length / 2);
      if (vertexCount < 2) return;

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
        Math.abs(firstX - lastX) < DIST_EPSILON &&
        Math.abs(firstY - lastY) < DIST_EPSILON;

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
    },
    [editingPolylineId, selectedHandles, doc.polylines, updateEntity]
  );

  const handleMergeVertices = useCallback(
    (e?: KeyboardEvent) => {
      const polylineIds = new Set<PolylineId>();

      if (editingPolylineId) {
        polylineIds.add(editingPolylineId);
      }

      for (const handle of selectedHandles) {
        if (handle.type === "POLYLINE") {
          polylineIds.add(handle.id);
        } else if (handle.type === "VERTEX") {
          polylineIds.add(handle.polylineId);
        }
      }

      if (polylineIds.size === 0) return;

      e?.preventDefault();

      for (const polylineId of polylineIds) {
        const polyline = doc.polylines[polylineId];
        if (!polyline) continue;

        const { polyline: mergedPolyline, deletedIndices } =
          mergePolylineVerticesWithIndices(polyline.polyline);

        if (deletedIndices.length > 0) {
          updatePolylineVertices(polylineId, mergedPolyline, {
            type: "DELETE",
            indices: deletedIndices,
          });
        }
      }
    },
    [editingPolylineId, selectedHandles, doc.polylines, updatePolylineVertices]
  );

  const handleDelete = useCallback(
    (e?: KeyboardEvent) => {
      if (e) {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
      }

      if (editingPolylineId) return;

      const selectedArray = Array.from(selectedHandles).filter(
        (handle) => handle.type !== "VERTEX"
      );
      if (selectedArray.length > 0) {
        e?.preventDefault();
        selectedArray.forEach((handle) => removeEntity(handle));
        clearSelection();
      }
    },
    [editingPolylineId, selectedHandles, removeEntity, clearSelection]
  );

  const shortcuts: Shortcut[] = useMemo(() => {
    return [
      {
        id: "undo",
        name: "Undo",
        keyCombo: "⌘Z",
        match: (e) => (e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey,
        action: (e) => {
          e?.preventDefault();
          if (cmd?.type === "DRAW_POLYLINE") removeLastVertex();
          else undo();
        },
      },
      {
        id: "redo",
        name: "Redo",
        keyCombo: "⌘⇧Z",
        match: (e) => (e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey,
        action: (e) => {
          e?.preventDefault();
          redo();
        },
      },
      {
        id: "cancel-deselect",
        name: "Cancel / Deselect",
        keyCombo: "Esc",
        match: (e) => e.key === "Escape",
        action: (e) => {
          if (cmd) {
            e?.preventDefault();
            cancelCmd();
          } else if (selectedHandles.size > 0) {
            e?.preventDefault();
            clearSelection();
          }
        },
        hide: true,
      },
      {
        id: "delete",
        name: "Delete",
        keyCombo: "⌫",
        match: (e) => e.key === "Delete" || e.key === "Backspace",
        action: (e) => handleDelete(e),
      },

      {
        id: "duplicate",
        name: "Duplicate",
        keyCombo: "⌘D",
        match: (e) =>
          (e.metaKey || e.ctrlKey) &&
          e.key.toLowerCase() === "d" &&
          !e.shiftKey,
        action: (e) => {
          e?.preventDefault();
          handleDuplicate(false);
        },
      },
      {
        id: "deep-duplicate",
        name: "Deep Duplicate",
        keyCombo: "⌘⇧D",
        match: (e) =>
          (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d" && e.shiftKey,
        action: (e) => {
          e?.preventDefault();
          handleDuplicate(true);
        },
      },
      {
        id: "draw-polyline",
        name: "Draw Polyline",
        keyCombo: "⌘P",
        match: (e) => (e.metaKey || e.ctrlKey) && e.key === "p",
        action: (e) => {
          e?.preventDefault();
          if (!cmd) startDrawPolyline();
        },
      },
      {
        id: "toggle-close",
        name: "Toggle Close Polyline",
        keyCombo: "⌘J",
        match: (e) => (e.metaKey || e.ctrlKey) && e.key === "j",
        action: (e) => handleToggleClose(e),
      },
      {
        id: "merge-vertices",
        name: "Merge Coincident Vertices",
        keyCombo: "⌘M",
        match: (e) => (e.metaKey || e.ctrlKey) && e.key === "m",
        action: (e) => handleMergeVertices(e),
      },
    ];
  }, [
    cmd,
    startDrawPolyline,
    cancelCmd,
    removeLastVertex,
    selectedHandles.size,
    undo,
    redo,
    handleDuplicate,
    handleToggleClose,
    handleMergeVertices,
    handleDelete,
    clearSelection,
  ]);

  return shortcuts;
}
