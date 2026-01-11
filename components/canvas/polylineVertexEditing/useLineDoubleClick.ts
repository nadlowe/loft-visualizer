import {
  findClosestSegment,
  getIntersectionPlane,
  intersectPlane,
  updatePointerFromEvent,
  worldToLocal,
} from "@/lib/canvas/vertexEditingUtils";
import type { PolylineHandle, VertexHandle } from "@/lib/entity/handleTypes";
import { PolylineEntity } from "@/lib/entity/polylineEntity";
import { useStore } from "@/lib/state/useStore";
import { PolylineId } from "@/lib/util/uid";
import { useCallback } from "react";
import * as THREE from "three";

interface UseLineDoubleClickProps {
  polyline: PolylineEntity | undefined;
  polylineId: PolylineId;
  polylineHandle: PolylineHandle;
  workPlane: THREE.Object3D | undefined;
  renderer: THREE.WebGLRenderer;
  camera: THREE.Camera;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  updatePolylineVertices: ReturnType<
    typeof useStore.getState
  >["updatePolylineVertices"];
  selectOnly: ReturnType<typeof useStore.getState>["selectOnly"];
  lastLineClickTimeRef: React.MutableRefObject<number>;
}

export function useLineDoubleClick({
  polyline,
  polylineId,
  polylineHandle,
  workPlane,
  renderer,
  camera,
  raycaster,
  pointer,
  updatePolylineVertices,
  selectOnly,
  lastLineClickTimeRef,
}: UseLineDoubleClickProps) {
  return useCallback(
    (e: any) => {
      const currentTime = Date.now();
      const timeSinceLastClick = currentTime - lastLineClickTimeRef.current;
      lastLineClickTimeRef.current = currentTime;

      if (timeSinceLastClick > 300) return;
      if (!polyline) return;

      const clientX = e.clientX ?? e.nativeEvent?.clientX;
      const clientY = e.clientY ?? e.nativeEvent?.clientY;
      updatePointerFromEvent(
        { clientX, clientY },
        renderer.domElement,
        pointer
      );
      raycaster.setFromCamera(pointer, camera);

      const plane = getIntersectionPlane(workPlane);
      const intersection = intersectPlane(raycaster, plane);
      if (!intersection) return;

      const localPoint = worldToLocal(intersection, workPlane);

      const vertexCount = Math.floor(polyline.polyline.length / 2);
      if (vertexCount < 2) return;

      const { segmentIndex } = findClosestSegment(
        localPoint,
        polyline.polyline
      );
      const insertIndex = (segmentIndex + 1) * 2;

      const newPolyline = [...polyline.polyline];
      newPolyline.splice(insertIndex, 0, localPoint.x, localPoint.y);

      updatePolylineVertices(polylineId, newPolyline, {
        type: "ADD",
        index: segmentIndex + 1,
      });

      const newVertexHandle: VertexHandle = {
        type: "VERTEX",
        polylineId,
        vertexIndex: segmentIndex + 1,
      };
      selectOnly(newVertexHandle);
    },
    [
      polyline,
      polylineId,
      polylineHandle,
      renderer,
      pointer,
      raycaster,
      camera,
      workPlane,
      updatePolylineVertices,
      selectOnly,
      lastLineClickTimeRef,
    ]
  );
}
