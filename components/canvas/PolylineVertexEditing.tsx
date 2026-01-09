"use client";

import { colors } from "@/components/ui/colors";
import { workPlanesTableToThree } from "@/lib/conversion/geomToThree";
import type { VertexHandle } from "@/lib/entity/handleTypes";
import { vertexHandleToHash } from "@/lib/entity/handleTypes";
import { snapToVertices } from "@/lib/snap/snapToVertices";
import { useStore } from "@/lib/state/useStore";
import { PolylineId } from "@/lib/util/uid";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { SelectionWindowOverlay } from "./SelectionWindowOverlay";

interface PolylineVertexEditingProps {
  polylineId: PolylineId;
  is2D: boolean;
  onDraggingChange?: (isDragging: boolean) => void;
}

export function PolylineVertexEditing({
  polylineId,
  is2D,
  onDraggingChange,
}: PolylineVertexEditingProps) {
  const { camera, raycaster, pointer, gl } = useThree();
  const {
    doc,
    updatePolyline,
    setEditingPolylineId,
    selectOnly,
    select,
    deselect,
    isSelected,
    clearSelection,
    selectedHandles,
    snapEnabled,
  } = useStore();
  const polyline = doc.polylines[polylineId];
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(
    null
  );
  const clickStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastLineClickTimeRef = useRef<number>(0);
  const isClickingVertexRef = useRef(false);
  const DRAG_THRESHOLD = 5;

  // Window selection state
  const [selectionRect, setSelectionRect] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
    canvasRect: DOMRect;
  } | null>(null);
  const windowSelectionStartRef = useRef<{ x: number; y: number } | null>(null);

  // Get all selected vertex indices from global selection
  const selectedVertexIndices = useMemo(() => {
    const indices: number[] = [];
    for (const handle of selectedHandles) {
      if (handle.type === "VERTEX" && handle.polylineId === polylineId) {
        indices.push(handle.vertexIndex);
      }
    }
    return indices;
  }, [selectedHandles, polylineId]);

  const hasSelectedVertices = selectedVertexIndices.length > 0;

  // Get work plane for this polyline
  const workPlanes = workPlanesTableToThree(doc.workPlanes);
  const workPlane = polyline?.workPlaneId
    ? workPlanes.find((wp) => wp.id === polyline.workPlaneId)?.workPlane
    : undefined;

  const handleVertexPointerDown = useCallback(
    (vertexIndex: number, e: any) => {
      // Mark that we're clicking on a vertex to prevent window selection
      isClickingVertexRef.current = true;
      requestAnimationFrame(() => {
        isClickingVertexRef.current = false;
      });

      // Store initial mouse position to detect click vs drag
      // R3F events have clientX/clientY and shiftKey directly on the event
      clickStartPosRef.current = {
        x: e.clientX ?? e.nativeEvent?.clientX,
        y: e.clientY ?? e.nativeEvent?.clientY,
      };

      // Select vertex using global selection
      const vertexHandle: VertexHandle = {
        type: "VERTEX",
        polylineId,
        vertexIndex,
      };

      // Check if this is a linked vertex (first or last of closed polyline)
      const vertexCount = polyline
        ? Math.floor(polyline.polyline.length / 2)
        : 0;
      const lastIdx = vertexCount - 1;
      const isLinkedVertex =
        polyline?.closed &&
        vertexCount >= 2 &&
        (vertexIndex === 0 || vertexIndex === lastIdx);
      const linkedIndex = vertexIndex === 0 ? lastIdx : 0;
      const linkedHandle: VertexHandle | null = isLinkedVertex
        ? { type: "VERTEX", polylineId, vertexIndex: linkedIndex }
        : null;

      // R3F events have shiftKey directly on the event object
      const shiftKey = e.shiftKey ?? e.nativeEvent?.shiftKey;
      if (shiftKey) {
        // Shift-click: toggle selection (add/remove from multi-selection)
        if (isSelected(vertexHandle)) {
          deselect(vertexHandle);
          if (linkedHandle) deselect(linkedHandle);
        } else {
          select(vertexHandle);
          if (linkedHandle) select(linkedHandle);
        }
      } else {
        // Regular click: select this vertex (and linked if closed)
        selectOnly(vertexHandle);
        if (linkedHandle) select(linkedHandle);
      }
    },
    [polylineId, polyline, selectOnly, select, deselect, isSelected]
  );

  const handleVertexDragStart = useCallback(
    (vertexIndex: number) => {
      setDraggingVertexIndex(vertexIndex);
      // Clear any window selection that may have started
      setSelectionRect(null);
      windowSelectionStartRef.current = null;
      // Selection is handled in handleVertexPointerDown, don't override here
      onDraggingChange?.(true);
      const { saveSnapshot } = useStore.getState();
      saveSnapshot();
    },
    [onDraggingChange]
  );

  const handleVertexDrag = useCallback(
    (vertexIndex: number, intersection: THREE.Vector3) => {
      if (!polyline) return;

      let x: number, y: number;
      if (workPlane) {
        // Transform world intersection to local work plane coordinates
        workPlane.updateMatrixWorld(true);
        const matrix = workPlane.matrixWorld;
        const worldOrigin = new THREE.Vector3().setFromMatrixPosition(matrix);
        const worldX = new THREE.Vector3()
          .setFromMatrixColumn(matrix, 0)
          .normalize();
        const worldY = new THREE.Vector3()
          .setFromMatrixColumn(matrix, 1)
          .normalize();

        // Get vector from work plane origin to intersection point
        const toIntersection = intersection.clone().sub(worldOrigin);

        // Project onto local X and Y axes (which are worldX and worldY)
        x = toIntersection.dot(worldX);
        y = toIntersection.dot(worldY);
      } else {
        // Standalone polyline - use world coordinates directly
        x = intersection.x;
        y = intersection.y;
      }

      // Apply snapping if enabled
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
          // Moving first vertex - also move last
          newPolyline[lastIdx * 2] = x;
          newPolyline[lastIdx * 2 + 1] = y;
        } else if (vertexIndex === lastIdx) {
          // Moving last vertex - also move first
          newPolyline[0] = x;
          newPolyline[1] = y;
        }
      }

      updatePolyline(
        polylineId,
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
      updatePolyline,
      snapEnabled,
      doc.polylines,
    ]
  );

  const handleVertexDragEnd = useCallback(() => {
    setDraggingVertexIndex(null);
    onDraggingChange?.(false);
  }, [onDraggingChange]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (draggingVertexIndex === null) return;

      const rect = gl.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      let intersection: THREE.Vector3 | null = null;

      if (workPlane) {
        // Intersect with work plane
        workPlane.updateMatrixWorld(true);
        // Extract basis vectors from work plane's matrix
        const matrix = workPlane.matrixWorld;
        const worldOrigin = new THREE.Vector3().setFromMatrixPosition(matrix);
        const worldX = new THREE.Vector3()
          .setFromMatrixColumn(matrix, 0)
          .normalize();
        const worldY = new THREE.Vector3()
          .setFromMatrixColumn(matrix, 1)
          .normalize();
        const worldZ = new THREE.Vector3()
          .setFromMatrixColumn(matrix, 2)
          .normalize();

        // Create plane using the work plane's world position and normal
        const plane = new THREE.Plane();
        plane.setFromNormalAndCoplanarPoint(worldZ, worldOrigin);
        intersection = new THREE.Vector3();
        if (!raycaster.ray.intersectPlane(plane, intersection)) {
          return;
        }
      } else {
        // For standalone polylines, intersect with XY plane at Z=0
        // Use a point on the plane and normal to define it
        const planePoint = new THREE.Vector3(0, 0, 0);
        const planeNormal = new THREE.Vector3(0, 0, 1);
        const plane = new THREE.Plane();
        plane.setFromNormalAndCoplanarPoint(planeNormal, planePoint);
        intersection = new THREE.Vector3();
        if (!raycaster.ray.intersectPlane(plane, intersection)) {
          return;
        }
      }

      if (intersection) {
        handleVertexDrag(draggingVertexIndex, intersection);
      }
    },
    [
      draggingVertexIndex,
      gl,
      pointer,
      raycaster,
      camera,
      workPlane,
      handleVertexDrag,
    ]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      // Check if this was a click (no significant movement) vs a drag
      if (clickStartPosRef.current && hasSelectedVertices) {
        const dx = Math.abs(e.clientX - clickStartPosRef.current.x);
        const dy = Math.abs(e.clientY - clickStartPosRef.current.y);
        if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
          // It was a click, not a drag - vertex is already selected
        }
      }
      clickStartPosRef.current = null;

      if (draggingVertexIndex !== null) {
        handleVertexDragEnd();
      }
    },
    [draggingVertexIndex, hasSelectedVertices, handleVertexDragEnd]
  );

  useEffect(() => {
    if (draggingVertexIndex !== null) {
      gl.domElement.addEventListener("mousemove", handleMouseMove);
      gl.domElement.addEventListener("mouseup", handleMouseUp);
      return () => {
        gl.domElement.removeEventListener("mousemove", handleMouseMove);
        gl.domElement.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [draggingVertexIndex, gl, handleMouseMove, handleMouseUp]);

  // Handle Escape key to clear selection or exit edit mode, Delete key to delete selected vertices
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (hasSelectedVertices) {
          // First press: clear vertex selection
          clearSelection();
        } else {
          // Second press (or no selection): exit edit mode and clear any selection
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

        // If already closed, unjoin (toggle off)
        if (polyline.closed) {
          updatePolyline(polylineId, (entity) => ({
            ...entity,
            closed: false,
          }));
          return;
        }

        // Get first vertex position
        const firstX = polyline.polyline[0];
        const firstY = polyline.polyline[1];

        // Check if first and last vertices already overlap
        const lastX = polyline.polyline[(vertexCount - 1) * 2];
        const lastY = polyline.polyline[(vertexCount - 1) * 2 + 1];
        const alreadyOverlapping =
          Math.abs(firstX - lastX) < 0.001 && Math.abs(firstY - lastY) < 0.001;

        let newLastIdx: number;

        if (alreadyOverlapping) {
          // Just mark as closed, don't add a new vertex
          updatePolyline(polylineId, (entity) => ({
            ...entity,
            closed: true,
          }));
          newLastIdx = vertexCount - 1;
        } else {
          // Add a new vertex at the first vertex position to close the polyline
          updatePolyline(polylineId, (entity) => {
            const newPolyline = [...entity.polyline, firstX, firstY];
            return {
              ...entity,
              polyline: newPolyline,
              closed: true,
            };
          });
          newLastIdx = vertexCount; // New vertex is at the end
        }

        // Select both first and last vertices
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

      if (e.key === "Delete" || e.key === "Backspace") {
        // If vertices are selected, delete them
        if (hasSelectedVertices && polyline) {
          e.preventDefault();

          const newPolyline = [...polyline.polyline];
          const vertexCount = Math.floor(newPolyline.length / 2);
          const lastIdx = vertexCount - 1;

          // Sort indices in descending order to delete from end first (preserves earlier indices)
          const sortedIndices = [...selectedVertexIndices].sort(
            (a, b) => b - a
          );

          // Check if we'd have at least 2 vertices remaining
          if (vertexCount - sortedIndices.length >= 2) {
            // Check if deleting first or last vertex of a closed polyline
            const deletingJoinedVertex =
              polyline.closed &&
              (sortedIndices.includes(0) || sortedIndices.includes(lastIdx));

            // Remove vertices from highest index to lowest
            for (const idx of sortedIndices) {
              newPolyline.splice(idx * 2, 2);
            }
            updatePolyline(polylineId, (entity) => ({
              ...entity,
              polyline: newPolyline,
              // Clear closed property if deleting a joined vertex
              closed: deletingJoinedVertex ? false : entity.closed,
            }));
            clearSelection();
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
    updatePolyline,
    setEditingPolylineId,
    clearSelection,
    select,
  ]);

  // Handle double-click on polyline to insert a new vertex
  const handleLineDoubleClick = useCallback(
    (e: any) => {
      const currentTime = Date.now();
      const timeSinceLastClick = currentTime - lastLineClickTimeRef.current;
      lastLineClickTimeRef.current = currentTime;

      if (timeSinceLastClick > 300) return; // Not a double-click

      if (!polyline) return;

      // Get intersection point with the plane
      const rect = gl.domElement.getBoundingClientRect();
      const clientX = e.clientX ?? e.nativeEvent?.clientX;
      const clientY = e.clientY ?? e.nativeEvent?.clientY;
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      let intersection: THREE.Vector3 | null = null;
      let localPoint: { x: number; y: number } | null = null;

      if (workPlane) {
        workPlane.updateMatrixWorld(true);
        const matrix = workPlane.matrixWorld;
        const worldOrigin = new THREE.Vector3().setFromMatrixPosition(matrix);
        const worldX = new THREE.Vector3()
          .setFromMatrixColumn(matrix, 0)
          .normalize();
        const worldY = new THREE.Vector3()
          .setFromMatrixColumn(matrix, 1)
          .normalize();
        const worldZ = new THREE.Vector3()
          .setFromMatrixColumn(matrix, 2)
          .normalize();

        const plane = new THREE.Plane();
        plane.setFromNormalAndCoplanarPoint(worldZ, worldOrigin);
        intersection = new THREE.Vector3();
        if (!raycaster.ray.intersectPlane(plane, intersection)) return;

        const toIntersection = intersection.clone().sub(worldOrigin);
        localPoint = {
          x: toIntersection.dot(worldX),
          y: toIntersection.dot(worldY),
        };
      } else {
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        intersection = new THREE.Vector3();
        if (!raycaster.ray.intersectPlane(plane, intersection)) return;
        localPoint = { x: intersection.x, y: intersection.y };
      }

      if (!localPoint) return;

      // Find the closest segment and insert point
      const vertexCount = Math.floor(polyline.polyline.length / 2);
      if (vertexCount < 2) return;

      let bestSegmentIndex = 0;
      let bestDistance = Infinity;
      let bestT = 0;

      for (let i = 0; i < vertexCount - 1; i++) {
        const x1 = polyline.polyline[i * 2];
        const y1 = polyline.polyline[i * 2 + 1];
        const x2 = polyline.polyline[(i + 1) * 2];
        const y2 = polyline.polyline[(i + 1) * 2 + 1];

        // Find closest point on segment
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSq = dx * dx + dy * dy;

        let t = 0;
        if (lengthSq > 0) {
          t = Math.max(
            0,
            Math.min(
              1,
              ((localPoint.x - x1) * dx + (localPoint.y - y1) * dy) / lengthSq
            )
          );
        }

        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;
        const dist = Math.sqrt(
          (localPoint.x - closestX) ** 2 + (localPoint.y - closestY) ** 2
        );

        if (dist < bestDistance) {
          bestDistance = dist;
          bestSegmentIndex = i;
          bestT = t;
        }
      }

      // Insert new vertex after bestSegmentIndex
      const insertIndex = (bestSegmentIndex + 1) * 2;

      updatePolyline(polylineId, (entity) => {
        const newPolyline = [...entity.polyline];
        newPolyline.splice(insertIndex, 0, localPoint.x, localPoint.y);
        return {
          ...entity,
          polyline: newPolyline,
        };
      });

      // Select the new vertex
      const newVertexHandle: VertexHandle = {
        type: "VERTEX",
        polylineId,
        vertexIndex: bestSegmentIndex + 1,
      };
      selectOnly(newVertexHandle);
    },
    [
      polyline,
      polylineId,
      gl,
      pointer,
      raycaster,
      camera,
      workPlane,
      updatePolyline,
      selectOnly,
    ]
  );

  // Window selection for vertices (only in 2D mode)
  useEffect(() => {
    if (!is2D) return;

    const handleWindowPointerDown = (e: PointerEvent) => {
      if (e.target !== gl.domElement) return;
      if (isClickingVertexRef.current) return;
      if (draggingVertexIndex !== null) return;

      windowSelectionStartRef.current = { x: e.clientX, y: e.clientY };
      setSelectionRect({
        start: { x: e.clientX, y: e.clientY },
        current: { x: e.clientX, y: e.clientY },
        canvasRect: gl.domElement.getBoundingClientRect(),
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
        // Calculate selection bounds in screen space
        const minX = Math.min(start.x, e.clientX);
        const maxX = Math.max(start.x, e.clientX);
        const minY = Math.min(start.y, e.clientY);
        const maxY = Math.max(start.y, e.clientY);

        // Find vertices within the selection rectangle
        const selectedVertices: VertexHandle[] = [];
        const count = polyline ? Math.floor(polyline.polyline.length / 2) : 0;

        for (let i = 0; i < count; i++) {
          const x = polyline!.polyline[i * 2];
          const y = polyline!.polyline[i * 2 + 1];

          let worldPos: THREE.Vector3;
          if (workPlane) {
            workPlane.updateMatrixWorld(true);
            worldPos = new THREE.Vector3(x, y, 0).applyMatrix4(
              workPlane.matrixWorld
            );
          } else {
            worldPos = new THREE.Vector3(x, y, 0);
          }

          // Project to screen
          const screenPos = worldPos.clone().project(camera);
          const rect = gl.domElement.getBoundingClientRect();
          const screenX = ((screenPos.x + 1) / 2) * rect.width + rect.left;
          const screenY = ((-screenPos.y + 1) / 2) * rect.height + rect.top;

          if (
            screenX >= minX &&
            screenX <= maxX &&
            screenY >= minY &&
            screenY <= maxY
          ) {
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

    gl.domElement.addEventListener("pointerdown", handleWindowPointerDown);
    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);

    return () => {
      gl.domElement.removeEventListener("pointerdown", handleWindowPointerDown);
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
    };
  }, [
    is2D,
    gl.domElement,
    polyline,
    polylineId,
    workPlane,
    camera,
    selectionRect,
    select,
    clearSelection,
    draggingVertexIndex,
  ]);

  // Render selection window overlay
  useEffect(() => {
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
  }, [selectionRect, gl.domElement]);

  if (!polyline) return null;

  // Get vertices for rendering
  // If on work plane: use local 2D coordinates (x, y, 0) - will be children of work plane
  // If standalone: use world coordinates
  const vertices: THREE.Vector3[] = [];
  const count = Math.floor(polyline.polyline.length / 2);
  for (let i = 0; i < count; i++) {
    const x = polyline.polyline[i * 2];
    const y = polyline.polyline[i * 2 + 1];
    if (workPlane) {
      // Local coordinates for work plane (will be transformed by work plane Group)
      vertices.push(new THREE.Vector3(x, y, 0));
    } else {
      // Standalone polyline - already in world coordinates (x, y map directly to world)
      vertices.push(new THREE.Vector3(x, y, 0));
    }
  }

  // Render vertex handles - as children of work plane if on work plane, otherwise standalone
  const vertexHandles = vertices.map((vertex, index) => (
    <VertexHandle
      key={index}
      vertex={vertex}
      vertexIndex={index}
      polylineId={polylineId}
      isSelected={selectedVertexIndices.includes(index)}
      onDragStart={() => handleVertexDragStart(index)}
      onPointerDown={(e) => handleVertexPointerDown(index, e)}
    />
  ));

  // Invisible mesh plane for click detection (covers the polyline area)
  const clickPlane = (
    <mesh visible={false} onPointerDown={handleLineDoubleClick}>
      <planeGeometry args={[1000, 1000]} />
      <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );

  if (workPlane) {
    // Render as children of work plane (uses local coordinates)
    return (
      <primitive object={workPlane}>
        {clickPlane}
        {vertexHandles}
      </primitive>
    );
  } else {
    // Render standalone (uses world coordinates)
    return (
      <>
        {clickPlane}
        {vertexHandles}
      </>
    );
  }
}

interface VertexHandleProps {
  vertex: THREE.Vector3;
  vertexIndex: number;
  polylineId: PolylineId;
  isSelected: boolean;
  onDragStart: () => void;
  onPointerDown: (e: any) => void;
}

function VertexHandle({
  vertex,
  vertexIndex,
  polylineId,
  isSelected,
  onDragStart,
  onPointerDown,
}: VertexHandleProps) {
  const handle: VertexHandle = {
    type: "VERTEX",
    polylineId,
    vertexIndex,
  };
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  // Scale based on camera distance to maintain constant screen size
  useFrame(() => {
    if (meshRef.current) {
      const distance = camera.position.distanceTo(meshRef.current.position);
      // Base size is 0.05, scale to maintain apparent size
      // Adjust the multiplier to control the screen size
      const scale = distance * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
  });

  // Update color based on selection
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.color.setHex(
        isSelected ? colors.selection.highlight : 0xffffff
      );
    }
  }, [isSelected]);

  return (
    <mesh
      ref={meshRef}
      position={vertex}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown(e);
        onDragStart();
      }}
      userData={{ handleHash: vertexHandleToHash(handle) }}
    >
      <sphereGeometry args={[0.05, 16, 16]} />
      <meshBasicMaterial
        ref={materialRef}
        color={isSelected ? colors.selection.highlight : 0xffffff}
      />
    </mesh>
  );
}
