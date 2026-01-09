"use client";

import { workPlanesTableToThree } from "@/lib/conversion/geomToThree";
import { hashToHandle, SelectableHandle } from "@/lib/entity/handleTypes";
import { useStore } from "@/lib/state/useStore";
import { PolylineId } from "@/lib/util/uid";
import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { SelectionWindowOverlay } from "./SelectionWindowOverlay";

const DRAG_THRESHOLD = 5;
const SELECTION_THRESHOLD = 0.1;
const PLANE = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

type SelectableLine = Line2 | THREE.LineSegments;

interface SelectionProps {
  is2D: boolean;
  onDraggingChange?: (isDragging: boolean) => void;
}

export function Selection({ is2D, onDraggingChange }: SelectionProps) {
  const { raycaster, pointer, camera, gl, scene } = useThree();
  const {
    selectOnly,
    toggleSelection,
    selectMultiple,
    clearSelection,
    selectedHandles,
    cmd,
    setEditingPolylineId,
    editingPolylineId,
    doc,
    updatePolyline,
    saveSnapshot,
  } = useStore();
  const isPanningRef = useRef(false);
  const spaceKeyPressedRef = useRef(false);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const lastClickHandleRef = useRef<SelectableHandle | null>(null);
  const [selectionRect, setSelectionRect] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
    canvasRect: DOMRect;
  } | null>(null);

  // Polyline dragging state
  const [draggingPolylineId, setDraggingPolylineId] =
    useState<PolylineId | null>(null);
  const dragStartLocalRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartVerticesRef = useRef<number[] | null>(null);
  // Pending drag - set on mousedown, converted to actual drag on mousemove if threshold exceeded
  const pendingDragRef = useRef<{
    polylineId: PolylineId;
    localStart: { x: number; y: number };
    vertices: number[];
  } | null>(null);

  // Get work planes for coordinate transformation
  const workPlanes = useMemo(
    () => workPlanesTableToThree(doc.workPlanes),
    [doc.workPlanes]
  );

  const resetSelectionState = useCallback(() => {
    setSelectionRect(null);
    mouseDownPosRef.current = null;
  }, []);

  const handleWindowSelection = useCallback(
    (e: MouseEvent, startWorld: THREE.Vector3, endWorld: THREE.Vector3) => {
      const rectMin = new THREE.Vector3(
        Math.min(startWorld.x, endWorld.x),
        Math.min(startWorld.y, endWorld.y),
        0
      );
      const rectMax = new THREE.Vector3(
        Math.max(startWorld.x, endWorld.x),
        Math.max(startWorld.y, endWorld.y),
        0
      );

      const lines = getSelectableLines(scene);
      const selectedLines = findPolylinesInRectangle(rectMin, rectMax, lines);

      if (selectedLines.length > 0) {
        const handles = selectedLines
          .map((line) => hashToHandle(line.userData.handleHash as string))
          .filter((handle): handle is SelectableHandle => handle !== undefined);

        if (e.shiftKey) {
          selectMultiple([...selectedHandles, ...handles]);
        } else {
          selectMultiple(handles);
        }
      } else if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
        clearSelection();
      }
    },
    [scene, selectedHandles, selectMultiple, clearSelection]
  );

  const handleClickSelection = useCallback(
    (e: MouseEvent, intersection: THREE.Vector3) => {
      const lines = getSelectableLines(scene);
      const closest = findClosestPolyline(intersection, lines, is2D, camera);

      if (closest) {
        e.preventDefault();
        e.stopPropagation();
        const handle = hashToHandle(closest.line.userData.handleHash as string);
        if (!handle) return;

        // Check for double-click (only for polylines, not vertices)
        const currentTime = Date.now();
        const timeSinceLastClick = currentTime - lastClickTimeRef.current;
        const lastHandle = lastClickHandleRef.current;
        const isDoubleClick =
          timeSinceLastClick < 300 &&
          lastHandle &&
          handle.type === "POLYLINE" &&
          lastHandle.type === "POLYLINE" &&
          handle.id === lastHandle.id;

        if (isDoubleClick) {
          // Enter vertex editing mode and clear entity selection
          clearSelection();
          setEditingPolylineId(handle.id as PolylineId);
          lastClickTimeRef.current = 0;
          lastClickHandleRef.current = null;
          return;
        }

        lastClickTimeRef.current = currentTime;
        lastClickHandleRef.current = handle;

        if (e.shiftKey) {
          toggleSelection(handle);
        } else {
          selectOnly(handle);
        }
      } else if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
        clearSelection();
      }
    },
    [
      scene,
      is2D,
      camera,
      toggleSelection,
      selectOnly,
      clearSelection,
      setEditingPolylineId,
    ]
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (
        e.target !== gl.domElement ||
        cmd?.type === "DRAW_POLYLINE" ||
        editingPolylineId
      )
        return;

      // Check if middle mouse button, right mouse button, or left button with space key (panning)
      if (
        e.button === 1 ||
        e.button === 2 ||
        (e.button === 0 && spaceKeyPressedRef.current)
      ) {
        isPanningRef.current = true;
        setSelectionRect(null); // Clear selection rect if panning starts
        return;
      }

      mouseDownPosRef.current = { x: e.clientX, y: e.clientY };

      // Check if clicking on an already-selected polyline (for dragging)
      if (e.button === 0) {
        const rect = gl.domElement.getBoundingClientRect();
        const pointerCoords = screenToPointer(e.clientX, e.clientY, rect);
        pointer.x = pointerCoords.x;
        pointer.y = pointerCoords.y;
        raycaster.setFromCamera(pointer, camera);

        const intersection = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(PLANE, intersection)) {
          const lines = getSelectableLines(scene);
          const closest = findClosestPolyline(
            intersection,
            lines,
            is2D,
            camera
          );

          if (closest) {
            const handle = hashToHandle(
              closest.line.userData.handleHash as string
            );
            if (handle && handle.type === "POLYLINE") {
              // Check if this polyline is already selected
              const isAlreadySelected = Array.from(selectedHandles).some(
                (h) => h.type === "POLYLINE" && h.id === handle.id
              );

              if (isAlreadySelected) {
                // Set up pending drag
                const polyline = doc.polylines[handle.id as PolylineId];
                if (polyline) {
                  const wp = polyline.workPlaneId
                    ? workPlanes.find((w) => w.id === polyline.workPlaneId)
                        ?.workPlane
                    : undefined;

                  let localX: number, localY: number;
                  if (wp) {
                    wp.updateMatrixWorld(true);
                    const matrix = wp.matrixWorld;
                    const worldOrigin =
                      new THREE.Vector3().setFromMatrixPosition(matrix);
                    const worldXAxis = new THREE.Vector3()
                      .setFromMatrixColumn(matrix, 0)
                      .normalize();
                    const worldYAxis = new THREE.Vector3()
                      .setFromMatrixColumn(matrix, 1)
                      .normalize();
                    const worldZAxis = new THREE.Vector3()
                      .setFromMatrixColumn(matrix, 2)
                      .normalize();

                    // Intersect with the work plane
                    const workPlane3 = new THREE.Plane();
                    workPlane3.setFromNormalAndCoplanarPoint(
                      worldZAxis,
                      worldOrigin
                    );
                    const wpIntersection = new THREE.Vector3();
                    if (
                      !raycaster.ray.intersectPlane(workPlane3, wpIntersection)
                    ) {
                      return;
                    }

                    const toIntersection = wpIntersection
                      .clone()
                      .sub(worldOrigin);
                    localX = toIntersection.dot(worldXAxis);
                    localY = toIntersection.dot(worldYAxis);
                  } else {
                    localX = intersection.x;
                    localY = intersection.y;
                  }

                  pendingDragRef.current = {
                    polylineId: handle.id as PolylineId,
                    localStart: { x: localX, y: localY },
                    vertices: [...polyline.polyline],
                  };
                  return; // Don't set up window selection
                }
              }
            }
          }
        }
      }

      if (is2D && e.button === 0) {
        setSelectionRect({
          start: { x: e.clientX, y: e.clientY },
          current: { x: e.clientX, y: e.clientY },
          canvasRect: gl.domElement.getBoundingClientRect(),
        });
      }
    },
    [
      gl.domElement,
      cmd,
      is2D,
      editingPolylineId,
      pointer,
      raycaster,
      camera,
      scene,
      selectedHandles,
      doc.polylines,
      workPlanes,
    ]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      // If panning, don't show selection rect
      if (isPanningRef.current || editingPolylineId) {
        return;
      }

      // Check if we should start actual drag from pending drag
      if (
        pendingDragRef.current &&
        mouseDownPosRef.current &&
        !draggingPolylineId
      ) {
        const dx = Math.abs(e.clientX - mouseDownPosRef.current.x);
        const dy = Math.abs(e.clientY - mouseDownPosRef.current.y);
        if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
          // Start actual drag
          saveSnapshot();
          setDraggingPolylineId(pendingDragRef.current.polylineId);
          dragStartLocalRef.current = pendingDragRef.current.localStart;
          dragStartVerticesRef.current = pendingDragRef.current.vertices;
          onDraggingChange?.(true);
          pendingDragRef.current = null;
        }
      }

      // Handle polyline dragging
      if (
        draggingPolylineId &&
        dragStartLocalRef.current &&
        dragStartVerticesRef.current
      ) {
        const polyline = doc.polylines[draggingPolylineId];
        if (!polyline) return;

        const rect = gl.domElement.getBoundingClientRect();
        const pointerCoords = screenToPointer(e.clientX, e.clientY, rect);
        pointer.x = pointerCoords.x;
        pointer.y = pointerCoords.y;
        raycaster.setFromCamera(pointer, camera);

        const wp = polyline.workPlaneId
          ? workPlanes.find((w) => w.id === polyline.workPlaneId)?.workPlane
          : undefined;

        let localX: number, localY: number;

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
          if (!raycaster.ray.intersectPlane(plane, intersection)) return;

          const toIntersection = intersection.clone().sub(worldOrigin);
          localX = toIntersection.dot(worldXAxis);
          localY = toIntersection.dot(worldYAxis);
        } else {
          const intersection = new THREE.Vector3();
          if (!raycaster.ray.intersectPlane(PLANE, intersection)) return;
          localX = intersection.x;
          localY = intersection.y;
        }

        // Calculate delta from drag start
        const deltaX = localX - dragStartLocalRef.current.x;
        const deltaY = localY - dragStartLocalRef.current.y;

        // Update all vertices by delta
        const startVertices = dragStartVerticesRef.current;
        const newVertices: number[] = [];
        for (let i = 0; i < startVertices.length; i += 2) {
          newVertices.push(startVertices[i] + deltaX);
          newVertices.push(startVertices[i + 1] + deltaY);
        }

        updatePolyline(
          draggingPolylineId,
          (entity) => ({
            ...entity,
            polyline: newVertices,
          }),
          false
        );
        return;
      }

      if (mouseDownPosRef.current && is2D && selectionRect) {
        setSelectionRect({
          ...selectionRect,
          current: { x: e.clientX, y: e.clientY },
          canvasRect: gl.domElement.getBoundingClientRect(),
        });
      }
    },
    [
      gl.domElement,
      is2D,
      selectionRect,
      editingPolylineId,
      draggingPolylineId,
      doc.polylines,
      workPlanes,
      pointer,
      raycaster,
      camera,
      updatePolyline,
      saveSnapshot,
      onDraggingChange,
    ]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      // End polyline dragging
      if (draggingPolylineId) {
        setDraggingPolylineId(null);
        dragStartLocalRef.current = null;
        dragStartVerticesRef.current = null;
        pendingDragRef.current = null;
        onDraggingChange?.(false);
        mouseDownPosRef.current = null;
        return;
      }

      // Clear pending drag if we didn't actually drag (allows click/double-click)
      if (pendingDragRef.current) {
        pendingDragRef.current = null;
        // Fall through to handle as a click
      }

      if (
        e.target !== gl.domElement ||
        !mouseDownPosRef.current ||
        cmd?.type === "DRAW_POLYLINE" ||
        editingPolylineId
      ) {
        isPanningRef.current = false;
        resetSelectionState();
        return;
      }

      // If we were panning, don't do selection
      if (isPanningRef.current) {
        isPanningRef.current = false;
        resetSelectionState();
        return;
      }

      const dx = Math.abs(e.clientX - mouseDownPosRef.current.x);
      const dy = Math.abs(e.clientY - mouseDownPosRef.current.y);
      const moved = dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD;

      if (is2D && selectionRect && moved) {
        const rect = gl.domElement.getBoundingClientRect();
        const startWorld = screenToWorld(
          selectionRect.start.x,
          selectionRect.start.y,
          rect,
          camera
        );
        const endWorld = screenToWorld(
          selectionRect.current.x,
          selectionRect.current.y,
          rect,
          camera
        );

        if (startWorld && endWorld) {
          handleWindowSelection(e, startWorld, endWorld);
        }
        resetSelectionState();
        return;
      }

      if (moved) {
        resetSelectionState();
        return;
      }

      const rect = gl.domElement.getBoundingClientRect();
      const pointerCoords = screenToPointer(e.clientX, e.clientY, rect);
      pointer.x = pointerCoords.x;
      pointer.y = pointerCoords.y;
      raycaster.setFromCamera(pointer, camera);

      const intersection = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(PLANE, intersection)) {
        resetSelectionState();
        return;
      }

      handleClickSelection(e, intersection);
      resetSelectionState();
    },
    [
      gl.domElement,
      cmd,
      is2D,
      selectionRect,
      camera,
      pointer,
      raycaster,
      handleWindowSelection,
      handleClickSelection,
      resetSelectionState,
      draggingPolylineId,
      onDraggingChange,
      editingPolylineId,
    ]
  );

  // Track space key for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === gl.domElement) {
        spaceKeyPressedRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceKeyPressedRef.current = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gl.domElement]);

  useEffect(() => {
    if (cmd?.type === "DRAW_POLYLINE") return;

    gl.domElement.addEventListener("mousedown", handleMouseDown);
    gl.domElement.addEventListener("mousemove", handleMouseMove);
    gl.domElement.addEventListener("mouseup", handleMouseUp);

    return () => {
      gl.domElement.removeEventListener("mousedown", handleMouseDown);
      gl.domElement.removeEventListener("mousemove", handleMouseMove);
      gl.domElement.removeEventListener("mouseup", handleMouseUp);
    };
  }, [gl.domElement, cmd, handleMouseDown, handleMouseMove, handleMouseUp]);

  // Clear selection rect when entering vertex editing mode
  useEffect(() => {
    if (editingPolylineId) {
      setSelectionRect(null);
    }
  }, [editingPolylineId]);

  useEffect(() => {
    // Don't show overlay if editing vertices or panning
    if (editingPolylineId || isPanningRef.current) {
      setSelectionRect(null);
      return;
    }

    const containerElement = gl.domElement.parentElement;
    if (!containerElement || !selectionRect) return;

    const overlayContainer = document.createElement("div");
    Object.assign(overlayContainer.style, {
      position: "absolute",
      pointerEvents: "none",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      zIndex: "10",
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
  }, [selectionRect, gl.domElement, editingPolylineId]);

  return null;
}

function getSelectableLines(scene: THREE.Scene): SelectableLine[] {
  const lines: SelectableLine[] = [];
  scene.traverse((object) => {
    if (
      (object instanceof Line2 || object instanceof THREE.LineSegments) &&
      object.userData.handleHash
    ) {
      lines.push(object);
    }
  });
  return lines;
}

function screenToPointer(clientX: number, clientY: number, rect: DOMRect) {
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  };
}

function screenToWorld(
  screenX: number,
  screenY: number,
  rect: DOMRect,
  camera: THREE.Camera
): THREE.Vector3 | null {
  const pointer = screenToPointer(screenX, screenY, rect);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(pointer.x, pointer.y), camera);
  const intersection = new THREE.Vector3();
  return raycaster.ray.intersectPlane(PLANE, intersection)
    ? intersection
    : null;
}

function getWorldPathPoints(line: SelectableLine): THREE.Vector3[] {
  line.updateMatrixWorld(true);
  const pathPoints = line.userData.pathPoints as THREE.Vector3[];
  if (!pathPoints || pathPoints.length < 2) return [];
  return pathPoints.map((pt) => pt.clone().applyMatrix4(line.matrixWorld));
}

function pointToLineSegmentDistance(
  point: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3
): number {
  const v = new THREE.Vector3().subVectors(p2, p1);
  const w = new THREE.Vector3().subVectors(point, p1);
  const c1 = w.dot(v);
  if (c1 <= 0) return point.distanceTo(p1);
  const c2 = v.dot(v);
  if (c2 <= c1) return point.distanceTo(p2);
  const b = c1 / c2;
  return point.distanceTo(p1.clone().add(v.multiplyScalar(b)));
}

function findClosestPolyline(
  clickPoint: THREE.Vector3,
  lines: SelectableLine[],
  is2D: boolean,
  camera: THREE.Camera
): { line: SelectableLine; distance: number } | null {
  let closest: { line: SelectableLine; distance: number } | null = null;

  for (const line of lines) {
    const worldPathPoints = getWorldPathPoints(line);
    if (worldPathPoints.length < 2) continue;

    let minDistance = Infinity;

    if (is2D) {
      const projectedClick = new THREE.Vector3(clickPoint.x, clickPoint.y, 0);
      const projected = worldPathPoints.map(
        (pt) => new THREE.Vector3(pt.x, pt.y, 0)
      );
      for (let i = 0; i < projected.length - 1; i++) {
        minDistance = Math.min(
          minDistance,
          pointToLineSegmentDistance(
            projectedClick,
            projected[i],
            projected[i + 1]
          )
        );
      }
    } else {
      const clickScreen = clickPoint.clone().project(camera);
      for (let i = 0; i < worldPathPoints.length - 1; i++) {
        const p1Screen = worldPathPoints[i].clone().project(camera);
        const p2Screen = worldPathPoints[i + 1].clone().project(camera);
        minDistance = Math.min(
          minDistance,
          pointToLineSegmentDistance(clickScreen, p1Screen, p2Screen)
        );
      }
    }

    if (
      minDistance < SELECTION_THRESHOLD &&
      (!closest || minDistance < closest.distance)
    ) {
      closest = { line, distance: minDistance };
    }
  }

  return closest;
}

function polylineIntersectsRectangle(
  pathPoints: THREE.Vector3[],
  rectMin: THREE.Vector3,
  rectMax: THREE.Vector3
): boolean {
  return pathPoints.some(
    (point) =>
      point.x >= rectMin.x &&
      point.x <= rectMax.x &&
      point.y >= rectMin.y &&
      point.y <= rectMax.y
  );
}

function findPolylinesInRectangle(
  rectMin: THREE.Vector3,
  rectMax: THREE.Vector3,
  lines: SelectableLine[]
): SelectableLine[] {
  return lines.filter((line) => {
    const worldPathPoints = getWorldPathPoints(line);
    return (
      worldPathPoints.length >= 2 &&
      polylineIntersectsRectangle(worldPathPoints, rectMin, rectMax)
    );
  });
}
