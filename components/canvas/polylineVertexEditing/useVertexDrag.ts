import { handleNew } from "@/lib/entity/handleTools/handleNew";
import { PolylineEntity } from "@/lib/entity/polylineEntity";
import { gridSnap } from "@/lib/snap/gridSnap";
import { snapToVertices } from "@/lib/snap/snapToVertices";
import { PolylineId } from "@/lib/util/uid";
import { useStore } from "@/store/useStore";
import { useCallback, useRef, useState } from "react";
import * as THREE from "three";
import {
  getIntersectionPlane,
  getPointerFromEvent,
  intersectPlane,
  worldToLocal,
} from "./vertexEditingUtils";

interface UseVertexDragProps {
  polylineId: PolylineId;
  polyline: PolylineEntity | undefined;
  workPlane: THREE.Object3D | undefined;
  renderer: THREE.WebGLRenderer;
  camera: THREE.Camera;
  raycaster: THREE.Raycaster;
  onDraggingChange?: (isDragging: boolean) => void;
}

export function useVertexDrag({
  polylineId,
  polyline,
  workPlane,
  renderer,
  camera,
  raycaster,
  onDraggingChange,
}: UseVertexDragProps) {
  const { doc, updateEntity, snapEnabled, gridSnapMode } = useStore();
  const polylineHandle = handleNew("POLYLINE", polylineId);

  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(
    null
  );
  const clickStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleVertexDragStart = useCallback(
    (vertexIndex: number) => {
      setDraggingVertexIndex(vertexIndex);
      onDraggingChange?.(true);
      const { saveSnapshot } = useStore.getState();
      saveSnapshot();
    },
    [onDraggingChange]
  );

  const handleVertexDrag = useCallback(
    (vertexIndex: number, intersection: THREE.Vector3) => {
      if (!polyline) return;

      // Apply grid snap to world coordinates first
      const gridSnapped = gridSnap(
        intersection.x,
        intersection.y,
        gridSnapMode
      );
      const snappedIntersection = intersection.clone();
      snappedIntersection.x = gridSnapped.x;
      snappedIntersection.y = gridSnapped.y;

      let { x, y } = worldToLocal(snappedIntersection, workPlane);

      // Apply vertex snapping if enabled
      if (snapEnabled) {
        const snapResult = snapToVertices(
          { x, y },
          polyline.workPlaneId,
          doc.polylines,
          polylineId,
          vertexIndex
        );
        if (snapResult.snapped) {
          x = snapResult.point.x;
          y = snapResult.point.y;
        }
      }

      // Update polyline vertex
      const newPolyline = [...polyline.polyline];
      const vertexCount = Math.floor(newPolyline.length / 2);
      const lastIdx = vertexCount - 1;

      newPolyline[vertexIndex * 2] = x;
      newPolyline[vertexIndex * 2 + 1] = y;

      // If closed, link first and last vertices
      if (polyline.closed && vertexCount >= 2) {
        if (vertexIndex === 0) {
          newPolyline[lastIdx * 2] = x;
          newPolyline[lastIdx * 2 + 1] = y;
        } else if (vertexIndex === lastIdx) {
          newPolyline[0] = x;
          newPolyline[1] = y;
        }
      }

      updateEntity(
        polylineHandle,
        (entity) => ({
          ...entity,
          polyline: newPolyline,
        }),
        false
      );
    },
    [
      polyline,
      polylineId,
      workPlane,
      updateEntity,
      snapEnabled,
      gridSnapMode,
      doc.polylines,
      polylineHandle,
    ]
  );

  const handleVertexDragEnd = useCallback(() => {
    setDraggingVertexIndex(null);
    onDraggingChange?.(false);
  }, [onDraggingChange]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (draggingVertexIndex === null) return;

      const pointerCoords = getPointerFromEvent(e, renderer.domElement);
      const currentPointer = new THREE.Vector2(
        pointerCoords.x,
        pointerCoords.y
      );
      raycaster.setFromCamera(currentPointer, camera);

      const plane = getIntersectionPlane(workPlane);
      const intersection = intersectPlane(raycaster, plane);

      if (intersection) {
        handleVertexDrag(draggingVertexIndex, intersection);
      }
    },
    [
      draggingVertexIndex,
      renderer,
      raycaster,
      camera,
      workPlane,
      handleVertexDrag,
    ]
  );

  const handleMouseUp = useCallback(() => {
    clickStartPosRef.current = null;
    if (draggingVertexIndex !== null) {
      handleVertexDragEnd();
    }
  }, [draggingVertexIndex, handleVertexDragEnd]);

  return {
    draggingVertexIndex,
    clickStartPosRef,
    handleVertexDragStart,
    handleVertexDrag,
    handleVertexDragEnd,
    handleMouseMove,
    handleMouseUp,
  };
}
