"use client";

import { EntityHandle, hashToHandle } from "@/lib/entity/handleTypes";
import { useStore } from "@/lib/state/useStore";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { SelectionWindowOverlay } from "./SelectionWindowOverlay";

type SelectableLine = Line2 | THREE.LineSegments;

interface PolylineSelectionProps {
  is2D: boolean;
}

export function Selection({ is2D }: PolylineSelectionProps) {
  const { raycaster, pointer, camera, gl, scene } = useThree();
  const {
    selectOnly,
    toggleSelection,
    selectMultiple,
    clearSelection,
    selectedHandles,
    cmd,
  } = useStore();
  const isDraggingRef = useRef(false);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const currentMousePosRef = useRef<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
    canvasRect: DOMRect;
  } | null>(null);
  const dragThreshold = 5;

  useEffect(() => {
    if (cmd?.type === "DRAW_POLYLINE") {
      return;
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (e.target !== gl.domElement) return;
      isDraggingRef.current = false;
      mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
      currentMousePosRef.current = { x: e.clientX, y: e.clientY };
      if (is2D && e.button === 0) {
        const rect = gl.domElement.getBoundingClientRect();
        setSelectionRect({
          start: { x: e.clientX, y: e.clientY },
          current: { x: e.clientX, y: e.clientY },
          canvasRect: rect,
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (mouseDownPosRef.current) {
        isDraggingRef.current = true;
        if (is2D && selectionRect) {
          currentMousePosRef.current = { x: e.clientX, y: e.clientY };
          const rect = gl.domElement.getBoundingClientRect();
          setSelectionRect({
            ...selectionRect,
            current: { x: e.clientX, y: e.clientY },
            canvasRect: rect,
          });
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.target !== gl.domElement || !mouseDownPosRef.current) {
        setSelectionRect(null);
        return;
      }

      const dx = Math.abs(e.clientX - mouseDownPosRef.current.x);
      const dy = Math.abs(e.clientY - mouseDownPosRef.current.y);
      const moved = dx > dragThreshold || dy > dragThreshold;

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

          const lines: SelectableLine[] = [];
          scene.traverse((object) => {
            if (
              (object instanceof Line2 ||
                object instanceof THREE.LineSegments) &&
              object.userData.handleHash
            ) {
              lines.push(object);
            }
          });

          const selectedLines = findPolylinesInRectangle(
            rectMin,
            rectMax,
            lines
          );

          if (selectedLines.length > 0) {
            const handles = selectedLines
              .map((line) => hashToHandle(line.userData.handleHash as string))
              .filter((handle): handle is EntityHandle => handle !== undefined);

            if (e.shiftKey) {
              const combinedHandles = new Set(selectedHandles);
              for (const handle of handles) {
                combinedHandles.add(handle);
              }
              selectMultiple(Array.from(combinedHandles));
            } else {
              selectMultiple(handles);
            }
          } else {
            if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
              clearSelection();
            }
          }
        }

        setSelectionRect(null);
        mouseDownPosRef.current = null;
        isDraggingRef.current = false;
        return;
      }

      // Skip click selection if we actually moved the mouse significantly
      // (Window selection already handled above in 2D mode)
      if (moved) {
        setSelectionRect(null);
        mouseDownPosRef.current = null;
        isDraggingRef.current = false;
        return;
      }

      const rect = gl.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersection = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(plane, intersection)) {
        setSelectionRect(null);
        mouseDownPosRef.current = null;
        return;
      }

      const lines: SelectableLine[] = [];
      scene.traverse((object) => {
        if (
          (object instanceof Line2 || object instanceof THREE.LineSegments) &&
          object.userData.handleHash
        ) {
          lines.push(object);
        }
      });

      const closest = findClosestPolyline(
        intersection,
        lines,
        is2D,
        camera,
        rect.width,
        rect.height
      );

      if (closest) {
        e.preventDefault();
        e.stopPropagation();
        const handle = hashToHandle(closest.line.userData.handleHash as string);
        if (!handle) return;

        if (e.shiftKey) {
          toggleSelection(handle);
        } else {
          selectOnly(handle);
        }
      } else {
        if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
          clearSelection();
        }
      }

      setSelectionRect(null);
      mouseDownPosRef.current = null;
      isDraggingRef.current = false;
    };

    gl.domElement.addEventListener("mousedown", handleMouseDown);
    gl.domElement.addEventListener("mousemove", handleMouseMove);
    gl.domElement.addEventListener("mouseup", handleMouseUp);

    return () => {
      gl.domElement.removeEventListener("mousedown", handleMouseDown);
      gl.domElement.removeEventListener("mousemove", handleMouseMove);
      gl.domElement.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    raycaster,
    pointer,
    camera,
    gl,
    scene,
    selectOnly,
    toggleSelection,
    selectMultiple,
    clearSelection,
    selectedHandles,
    cmd,
    is2D,
    selectionRect,
  ]);

  useEffect(() => {
    const containerElement = gl.domElement.parentElement;
    if (!containerElement) return;

    let root: ReturnType<typeof createRoot> | null = null;
    let overlayContainer: HTMLDivElement | null = null;

    if (selectionRect) {
      overlayContainer = document.createElement("div");
      overlayContainer.style.position = "absolute";
      overlayContainer.style.pointerEvents = "none";
      overlayContainer.style.top = "0";
      overlayContainer.style.left = "0";
      overlayContainer.style.width = "100%";
      overlayContainer.style.height = "100%";
      overlayContainer.style.zIndex = "10";
      containerElement.appendChild(overlayContainer);

      root = createRoot(overlayContainer);
      root.render(
        <SelectionWindowOverlay
          start={selectionRect.start}
          current={selectionRect.current}
          canvasRect={selectionRect.canvasRect}
        />
      );
    }

    return () => {
      if (root) {
        root.unmount();
      }
      if (overlayContainer && overlayContainer.parentElement) {
        overlayContainer.parentElement.removeChild(overlayContainer);
      }
    };
  }, [selectionRect, gl]);

  return null;
}

function pointToLineSegmentDistance(
  point: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3
): number {
  const v = new THREE.Vector3().subVectors(p2, p1);
  const w = new THREE.Vector3().subVectors(point, p1);
  const c1 = w.dot(v);
  if (c1 <= 0) {
    return point.distanceTo(p1);
  }
  const c2 = v.dot(v);
  if (c2 <= c1) {
    return point.distanceTo(p2);
  }
  const b = c1 / c2;
  const vScaled = new THREE.Vector3().copy(v).multiplyScalar(b);
  const pb = new THREE.Vector3().addVectors(p1, vScaled);
  return point.distanceTo(pb);
}

const SELECTION_THRESHOLD_PIXELS = 1;

function getWorldUnitsPerPixel(
  camera: THREE.Camera,
  canvasWidth: number,
  canvasHeight: number
): number {
  if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
    const orthoCamera = camera as THREE.OrthographicCamera;
    const visibleWidth =
      (orthoCamera.right - orthoCamera.left) / orthoCamera.zoom;
    return visibleWidth / canvasWidth;
  } else {
    const perspCamera = camera as THREE.PerspectiveCamera;
    const distance = camera.position.length();
    const vFov = (perspCamera.fov * Math.PI) / 180;
    const visibleHeight = 2 * Math.tan(vFov / 2) * distance;
    return visibleHeight / canvasHeight;
  }
}

function findClosestPolyline(
  clickPoint: THREE.Vector3,
  lines: SelectableLine[],
  is2D: boolean,
  camera: THREE.Camera,
  canvasWidth: number,
  canvasHeight: number
): { line: SelectableLine; distance: number } | null {
  let closest: { line: SelectableLine; distance: number } | null = null;

  const worldUnitsPerPixel = getWorldUnitsPerPixel(
    camera,
    canvasWidth,
    canvasHeight
  );
  const threshold = SELECTION_THRESHOLD_PIXELS * worldUnitsPerPixel;

  for (const line of lines) {
    const pathPoints = line.userData.pathPoints as THREE.Vector3[];
    if (!pathPoints || pathPoints.length < 2) continue;

    // Transform pathPoints to world space
    line.updateMatrixWorld(true);
    const worldMatrix = line.matrixWorld;

    const worldPathPoints = pathPoints.map((pt) => {
      return pt.clone().applyMatrix4(worldMatrix);
    });

    let minDistance = Infinity;

    if (is2D) {
      // For 2D selection, project all points to XY plane (Z=0) for distance calculation
      // This matches how window selection works (it only checks X and Y coordinates)
      const projectedClickPoint = new THREE.Vector3(
        clickPoint.x,
        clickPoint.y,
        0
      );
      const projectedPathPoints = worldPathPoints.map((pt) => {
        return new THREE.Vector3(pt.x, pt.y, 0);
      });

      for (let i = 0; i < projectedPathPoints.length - 1; i++) {
        const dist = pointToLineSegmentDistance(
          projectedClickPoint,
          projectedPathPoints[i],
          projectedPathPoints[i + 1]
        );
        minDistance = Math.min(minDistance, dist);
      }
    } else {
      // For 3D selection, use screen-space distances
      const clickScreen = clickPoint.clone().project(camera);
      for (let i = 0; i < worldPathPoints.length - 1; i++) {
        const p1Screen = worldPathPoints[i].clone().project(camera);
        const p2Screen = worldPathPoints[i + 1].clone().project(camera);
        const dist = pointToLineSegmentDistance(
          clickScreen,
          p1Screen,
          p2Screen
        );
        minDistance = Math.min(minDistance, dist);
      }
    }

    if (minDistance < threshold) {
      if (!closest || minDistance < closest.distance) {
        closest = { line, distance: minDistance };
      }
    }
  }

  return closest;
}

function screenToWorld(
  screenX: number,
  screenY: number,
  rect: DOMRect,
  camera: THREE.Camera
): THREE.Vector3 | null {
  const pointer = new THREE.Vector2();
  pointer.x = ((screenX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((screenY - rect.top) / rect.height) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, camera);

  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const intersection = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(plane, intersection)) {
    return intersection;
  }
  return null;
}

function polylineIntersectsRectangle(
  pathPoints: THREE.Vector3[],
  rectMin: THREE.Vector3,
  rectMax: THREE.Vector3
): boolean {
  for (const point of pathPoints) {
    if (
      point.x >= rectMin.x &&
      point.x <= rectMax.x &&
      point.y >= rectMin.y &&
      point.y <= rectMax.y
    ) {
      return true;
    }
  }
  return false;
}

function findPolylinesInRectangle(
  rectMin: THREE.Vector3,
  rectMax: THREE.Vector3,
  lines: SelectableLine[]
): SelectableLine[] {
  const result: SelectableLine[] = [];
  for (const line of lines) {
    const pathPoints = line.userData.pathPoints as THREE.Vector3[];
    if (!pathPoints || pathPoints.length < 2) continue;

    // Transform pathPoints to world space
    line.updateMatrixWorld(true);
    const worldMatrix = line.matrixWorld;
    const worldPathPoints = pathPoints.map((pt) => {
      return pt.clone().applyMatrix4(worldMatrix);
    });

    if (polylineIntersectsRectangle(worldPathPoints, rectMin, rectMax)) {
      result.push(line);
    }
  }
  return result;
}
