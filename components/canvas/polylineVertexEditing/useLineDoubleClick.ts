import type { VertexHandle } from "@/lib/entity/handleTypes";
import { PolylineEntity } from "@/lib/entity/polylineEntity";
import { PolylineId } from "@/lib/util/uid";
import { useStore } from "@/store/useStore";
import { useCallback } from "react";
import * as THREE from "three";
import {
  findClosestSegment,
  getIntersectionPlane,
  getPointerFromEvent,
  intersectPlane,
  worldToLocal,
} from "./vertexEditingUtils";

interface UseLineDoubleClickProps {
  polyline: PolylineEntity | undefined;
  polylineId: PolylineId;
  workPlane: THREE.Object3D | undefined;
  renderer: THREE.WebGLRenderer;
  camera: THREE.Camera;
  raycaster: THREE.Raycaster;
  updatePolylineVertices: ReturnType<
    typeof useStore.getState
  >["updatePolylineVertices"];
  selectOnly: ReturnType<typeof useStore.getState>["selectOnly"];
  lastLineClickTimeRef: React.MutableRefObject<number>;
}

export function useLineDoubleClick({
  polyline,
  polylineId,
  workPlane,
  renderer,
  camera,
  raycaster,
  updatePolylineVertices,
  selectOnly,
  lastLineClickTimeRef,
}: UseLineDoubleClickProps) {
  return useCallback(
    (e: {
      clientX?: number;
      clientY?: number;
      nativeEvent?: { clientX: number; clientY: number };
    }) => {
      const currentTime = Date.now();
      const timeSinceLastClick = currentTime - lastLineClickTimeRef.current;
      lastLineClickTimeRef.current = currentTime;

      if (timeSinceLastClick > 300) return;
      if (!polyline) return;

      const clientX = e.clientX ?? e.nativeEvent?.clientX;
      const clientY = e.clientY ?? e.nativeEvent?.clientY;
      if (clientX === undefined || clientY === undefined) return;

      const pointerCoords = getPointerFromEvent(
        { clientX, clientY },
        renderer.domElement
      );
      const currentPointer = new THREE.Vector2(
        pointerCoords.x,
        pointerCoords.y
      );
      raycaster.setFromCamera(currentPointer, camera);

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
      renderer,
      raycaster,
      camera,
      workPlane,
      updatePolylineVertices,
      selectOnly,
      lastLineClickTimeRef,
    ]
  );
}
