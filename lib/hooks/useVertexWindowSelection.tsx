import { VertexHandle } from "@/lib/entity/handleTypes";
import { PolylineEntity } from "@/lib/entity/polylineEntity";
import { useStore } from "@/lib/state/useStore";
import { PolylineId } from "@/lib/util/uid";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { SelectionWindowOverlay } from "../../components/canvas/SelectionWindowOverlay";
import {
  DRAG_THRESHOLD,
  isPointInRect,
  vertexToScreen,
} from "../canvas/vertexEditingUtils";

interface SelectionRect {
  start: { x: number; y: number };
  current: { x: number; y: number };
  canvasRect: DOMRect;
}

interface UseVertexWindowSelectionProps {
  polylineId: PolylineId;
  polyline: PolylineEntity | undefined;
  workPlane: THREE.Object3D | undefined;
  renderer: THREE.WebGLRenderer;
  camera: THREE.Camera;
  is2D: boolean;
  draggingVertexIndex: number | null;
  isClickingVertexRef: React.MutableRefObject<boolean>;
}

export function useVertexWindowSelection({
  polylineId,
  polyline,
  workPlane,
  renderer,
  camera,
  is2D,
  draggingVertexIndex,
  isClickingVertexRef,
}: UseVertexWindowSelectionProps) {
  const { select, clearSelection } = useStore();

  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(
    null
  );
  const windowSelectionStartRef = useRef<{ x: number; y: number } | null>(null);
  // Window selection event handlers
  useEffect(() => {
    if (!is2D) return;

    const handleWindowPointerDown = (e: PointerEvent) => {
      if (e.target !== renderer.domElement) return;
      if (isClickingVertexRef.current) return;
      if (draggingVertexIndex !== null) return;
      // Don't start selection when panning (right mouse button = 2, middle = 1)
      if (e.button === 1 || e.button === 2) return;

      windowSelectionStartRef.current = { x: e.clientX, y: e.clientY };
      setSelectionRect({
        start: { x: e.clientX, y: e.clientY },
        current: { x: e.clientX, y: e.clientY },
        canvasRect: renderer.domElement.getBoundingClientRect(),
      });
    };

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (!windowSelectionStartRef.current) return;
      setSelectionRect((prev) =>
        prev
          ? {
              ...prev,
              current: { x: e.clientX, y: e.clientY },
            }
          : null
      );
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      if (!windowSelectionStartRef.current || !selectionRect) {
        windowSelectionStartRef.current = null;
        setSelectionRect(null);
        return;
      }

      const start = windowSelectionStartRef.current;
      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);

      if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
        const minX = Math.min(start.x, e.clientX);
        const maxX = Math.max(start.x, e.clientX);
        const minY = Math.min(start.y, e.clientY);
        const maxY = Math.max(start.y, e.clientY);

        const selectedVertices: VertexHandle[] = [];
        const count = polyline ? Math.floor(polyline.polyline.length / 2) : 0;

        for (let i = 0; i < count; i++) {
          const x = polyline!.polyline[i * 2];
          const y = polyline!.polyline[i * 2 + 1];

          const screenPos = vertexToScreen(
            x,
            y,
            workPlane,
            camera,
            renderer.domElement
          );

          if (isPointInRect(screenPos, minX, maxX, minY, maxY)) {
            selectedVertices.push({
              type: "VERTEX",
              polylineId,
              vertexIndex: i,
            });
          }
        }

        if (selectedVertices.length > 0) {
          if (e.shiftKey) {
            selectedVertices.forEach((h) => select(h));
          } else {
            clearSelection();
            selectedVertices.forEach((h) => select(h));
          }
        } else if (!e.shiftKey) {
          clearSelection();
        }
      }

      windowSelectionStartRef.current = null;
      setSelectionRect(null);
    };

    renderer.domElement.addEventListener(
      "pointerdown",
      handleWindowPointerDown
    );
    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);

    return () => {
      renderer.domElement.removeEventListener(
        "pointerdown",
        handleWindowPointerDown
      );
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
    };
  }, [
    is2D,
    renderer.domElement,
    polyline,
    polylineId,
    workPlane,
    camera,
    selectionRect,
    select,
    clearSelection,
    draggingVertexIndex,
    isClickingVertexRef,
  ]);

  // Render selection overlay
  useEffect(() => {
    const containerElement = renderer.domElement.parentElement;
    if (!containerElement || !selectionRect) return;

    const overlayContainer = document.createElement("div");
    Object.assign(overlayContainer.style, {
      position: "absolute",
      pointerEvents: "none",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
    });
    containerElement.appendChild(overlayContainer);

    const root = createRoot(overlayContainer);
    root.render(
      <SelectionWindowOverlay
        start={selectionRect.start}
        current={selectionRect.current}
        canvasRect={selectionRect.canvasRect}
      />
    );

    return () => {
      root.unmount();
      overlayContainer.parentElement?.removeChild(overlayContainer);
    };
  }, [selectionRect, renderer.domElement]);

  return {
    selectionRect,
    setSelectionRect,
  };
}
