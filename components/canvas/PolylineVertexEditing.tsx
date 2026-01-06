"use client";

import { colors } from "@/components/ui/colors";
import { workPlanesTableToThree } from "@/lib/conversion/geomToThree";
import type { VertexHandle } from "@/lib/entity/handleTypes";
import { vertexHandleToHash } from "@/lib/entity/handleTypes";
import { useStore } from "@/lib/state/useStore";
import { PolylineId } from "@/lib/util/uid";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

interface PolylineVertexEditingProps {
  polylineId: PolylineId;
  onDraggingChange?: (isDragging: boolean) => void;
}

export function PolylineVertexEditing({
  polylineId,
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
  } = useStore();
  const polyline = doc.polylines[polylineId];
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(
    null
  );
  const clickStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastLineClickTimeRef = useRef<number>(0);
  const DRAG_THRESHOLD = 5;

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

      // R3F events have shiftKey directly on the event object
      const shiftKey = e.shiftKey ?? e.nativeEvent?.shiftKey;
      if (shiftKey) {
        // Shift-click: toggle selection (add/remove from multi-selection)
        if (isSelected(vertexHandle)) {
          deselect(vertexHandle);
        } else {
          select(vertexHandle);
        }
      } else {
        // Regular click: select only this vertex
        selectOnly(vertexHandle);
      }
    },
    [polylineId, selectOnly, select, deselect, isSelected]
  );

  const handleVertexDragStart = useCallback(
    (vertexIndex: number) => {
      setDraggingVertexIndex(vertexIndex);
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

      // Update polyline vertex
      const newPolyline = [...polyline.polyline];
      newPolyline[vertexIndex * 2] = x;
      newPolyline[vertexIndex * 2 + 1] = y;

      updatePolyline(polylineId, (entity) => ({
        ...entity,
        polyline: newPolyline,
      }));
    },
    [polyline, polylineId, workPlane, updatePolyline]
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

      if (e.key === "Delete" || e.key === "Backspace") {
        // If vertices are selected, delete them
        if (hasSelectedVertices && polyline) {
          e.preventDefault();

          const newPolyline = [...polyline.polyline];
          const vertexCount = Math.floor(newPolyline.length / 2);

          // Sort indices in descending order to delete from end first (preserves earlier indices)
          const sortedIndices = [...selectedVertexIndices].sort(
            (a, b) => b - a
          );

          // Check if we'd have at least 2 vertices remaining
          if (vertexCount - sortedIndices.length >= 2) {
            // Remove vertices from highest index to lowest
            for (const idx of sortedIndices) {
              newPolyline.splice(idx * 2, 2);
            }
            updatePolyline(polylineId, (entity) => ({
              ...entity,
              polyline: newPolyline,
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
