import { workPlanesTableToThree } from "@/lib/conversion/geomToThree";
import { handleNew } from "@/lib/entity/handle";
import { hashToHandle } from "@/lib/entity/handleTypes";
import { gridSnap } from "@/lib/snap/gridSnap";
import { useStore } from "@/lib/state/useStore";
import { PolylineId } from "@/lib/util/uid";
import { useCallback, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  DRAG_THRESHOLD,
  findClosestPolyline,
  getSelectableLines,
  GROUND_PLANE,
  screenToPointer,
} from "../canvas/selectionUtils";

interface UsePolylineDragProps {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  is2D: boolean;
  onDraggingChange?: (isDragging: boolean) => void;
}

interface PendingDrag {
  polylineId: PolylineId;
  localStart: { x: number; y: number };
  vertices: number[];
}

export function usePolylineDrag({
  scene,
  camera,
  renderer,
  raycaster,
  pointer,
  is2D,
  onDraggingChange,
}: UsePolylineDragProps) {
  const { doc, updateEntity, saveSnapshot, selectedHandles, gridSnapMode } =
    useStore();

  const [draggingPolylineId, setDraggingPolylineId] =
    useState<PolylineId | null>(null);
  const dragStartLocalRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartVerticesRef = useRef<number[] | null>(null);
  const pendingDragRef = useRef<PendingDrag | null>(null);

  const workPlanes = useMemo(
    () => workPlanesTableToThree(doc.workPlanes),
    [doc.workPlanes]
  );

  // Get local coordinates from world intersection on a work plane (or ground plane)
  const getLocalCoords = useCallback(
    (workPlaneId: string | undefined): { x: number; y: number } | null => {
      const wp = workPlaneId
        ? workPlanes.find((w) => w.id === workPlaneId)?.workPlane
        : undefined;

      if (wp) {
        wp.updateMatrixWorld(true);
        const matrix = wp.matrixWorld;
        const worldOrigin = new THREE.Vector3().setFromMatrixPosition(matrix);
        const worldXAxis = new THREE.Vector3()
          .setFromMatrixColumn(matrix, 0)
          .normalize();
        const worldYAxis = new THREE.Vector3()
          .setFromMatrixColumn(matrix, 1)
          .normalize();
        const worldZAxis = new THREE.Vector3()
          .setFromMatrixColumn(matrix, 2)
          .normalize();

        const plane = new THREE.Plane();
        plane.setFromNormalAndCoplanarPoint(worldZAxis, worldOrigin);
        const intersection = new THREE.Vector3();
        if (!raycaster.ray.intersectPlane(plane, intersection)) return null;

        const toIntersection = intersection.clone().sub(worldOrigin);
        return {
          x: toIntersection.dot(worldXAxis),
          y: toIntersection.dot(worldYAxis),
        };
      } else {
        const intersection = new THREE.Vector3();
        if (!raycaster.ray.intersectPlane(GROUND_PLANE, intersection))
          return null;
        return { x: intersection.x, y: intersection.y };
      }
    },
    [workPlanes, raycaster]
  );

  // Try to initiate a pending drag on mousedown (returns true if drag was set up)
  const tryStartPendingDrag = useCallback(
    (clientX: number, clientY: number): boolean => {
      const rect = renderer.domElement.getBoundingClientRect();
      const pointerCoords = screenToPointer(clientX, clientY, rect);
      pointer.x = pointerCoords.x;
      pointer.y = pointerCoords.y;
      raycaster.setFromCamera(pointer, camera);

      const intersection = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(GROUND_PLANE, intersection))
        return false;

      const lines = getSelectableLines(scene);
      const closest = findClosestPolyline(
        intersection,
        lines,
        is2D,
        camera,
        rect.width,
        rect.height
      );

      if (!closest) return false;

      const handle = hashToHandle(closest.line.userData.handleHash as string);
      if (!handle || handle.type !== "POLYLINE") return false;

      // Check if this polyline is already selected
      const isAlreadySelected = Array.from(selectedHandles).some(
        (h) => h.type === "POLYLINE" && h.id === handle.id
      );

      if (!isAlreadySelected) return false;

      const polyline = doc.polylines[handle.id as PolylineId];
      if (!polyline) return false;

      const localCoords = getLocalCoords(polyline.workPlaneId);
      if (!localCoords) return false;

      pendingDragRef.current = {
        polylineId: handle.id as PolylineId,
        localStart: localCoords,
        vertices: [...polyline.polyline],
      };

      return true;
    },
    [
      renderer.domElement,
      pointer,
      raycaster,
      camera,
      scene,
      is2D,
      selectedHandles,
      doc.polylines,
      getLocalCoords,
    ]
  );

  // Check if mouse has moved enough to convert pending drag to actual drag
  const checkStartDrag = useCallback(
    (
      clientX: number,
      clientY: number,
      mouseDownPos: { x: number; y: number }
    ): boolean => {
      if (!pendingDragRef.current || draggingPolylineId) return false;

      const dx = Math.abs(clientX - mouseDownPos.x);
      const dy = Math.abs(clientY - mouseDownPos.y);

      if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
        saveSnapshot();
        setDraggingPolylineId(pendingDragRef.current.polylineId);
        dragStartLocalRef.current = pendingDragRef.current.localStart;
        dragStartVerticesRef.current = pendingDragRef.current.vertices;
        onDraggingChange?.(true);
        pendingDragRef.current = null;
        return true;
      }

      return false;
    },
    [draggingPolylineId, saveSnapshot, onDraggingChange]
  );

  // Handle mouse move during drag
  const handleDragMove = useCallback(
    (clientX: number, clientY: number): boolean => {
      if (
        !draggingPolylineId ||
        !dragStartLocalRef.current ||
        !dragStartVerticesRef.current
      )
        return false;

      const polyline = doc.polylines[draggingPolylineId];
      if (!polyline) return false;

      const rect = renderer.domElement.getBoundingClientRect();
      const pointerCoords = screenToPointer(clientX, clientY, rect);
      pointer.x = pointerCoords.x;
      pointer.y = pointerCoords.y;
      raycaster.setFromCamera(pointer, camera);

      // Get world intersection on ground plane and apply grid snap
      const worldIntersection = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(GROUND_PLANE, worldIntersection))
        return false;

      const gridSnapped = gridSnap(
        worldIntersection.x,
        worldIntersection.y,
        gridSnapMode
      );

      // For polylines on ground plane, use grid-snapped world coords directly
      // For polylines on work planes, get local coords (grid snap applies to world)
      const localCoords = polyline.workPlaneId
        ? getLocalCoords(polyline.workPlaneId)
        : { x: gridSnapped.x, y: gridSnapped.y };

      if (!localCoords) return false;

      const deltaX = localCoords.x - dragStartLocalRef.current.x;
      const deltaY = localCoords.y - dragStartLocalRef.current.y;

      const startVertices = dragStartVerticesRef.current;
      const newVertices: number[] = [];
      for (let i = 0; i < startVertices.length; i += 2) {
        newVertices.push(startVertices[i] + deltaX);
        newVertices.push(startVertices[i + 1] + deltaY);
      }

      updateEntity(
        handleNew("POLYLINE", draggingPolylineId),
        (entity) => ({
          ...entity,
          polyline: newVertices,
        }),
        false
      );

      return true;
    },
    [
      draggingPolylineId,
      doc.polylines,
      renderer.domElement,
      pointer,
      raycaster,
      camera,
      getLocalCoords,
      gridSnapMode,
      updateEntity,
    ]
  );

  // End drag
  const endDrag = useCallback(() => {
    if (draggingPolylineId) {
      setDraggingPolylineId(null);
      dragStartLocalRef.current = null;
      dragStartVerticesRef.current = null;
      onDraggingChange?.(false);
    }
    pendingDragRef.current = null;
  }, [draggingPolylineId, onDraggingChange]);

  // Clear pending drag without ending an active drag
  const clearPendingDrag = useCallback(() => {
    pendingDragRef.current = null;
  }, []);

  return {
    draggingPolylineId,
    hasPendingDrag: () => pendingDragRef.current !== null,
    tryStartPendingDrag,
    checkStartDrag,
    handleDragMove,
    endDrag,
    clearPendingDrag,
  };
}
