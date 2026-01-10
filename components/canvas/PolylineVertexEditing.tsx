"use client";

import { colors } from "@/components/ui/colors";
import {
  findClosestSegment,
  getIntersectionPlane,
  intersectPlane,
  updatePointerFromEvent,
  worldToLocal,
} from "@/lib/canvas/vertexEditingUtils";
import { workPlanesTableToThree } from "@/lib/conversion/geomToThree";
import { handleNew } from "@/lib/entity/handle";
import type { PolylineHandle, VertexHandle } from "@/lib/entity/handleTypes";
import { vertexHandleToHash } from "@/lib/entity/handleTypes";
import { PolylineEntity } from "@/lib/entity/polylineEntity";
import { useVertexDrag } from "@/lib/hooks/useVertexDrag";
import { useVertexWindowSelection } from "@/lib/hooks/useVertexWindowSelection";
import { gridSnap } from "@/lib/snap/gridSnap";
import { useStore } from "@/lib/state/useStore";
import { PolylineId } from "@/lib/util/uid";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

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
  const { camera, raycaster, pointer, gl: renderer } = useThree();
  const {
    doc,
    updateEntity,
    setEditingPolylineId,
    selectOnly,
    select,
    deselect,
    isSelected,
    clearSelection,
    selectedHandles,
    getEntity,
  } = useStore();

  const polylineHandle = handleNew("POLYLINE", polylineId);
  const polyline = getEntity(polylineHandle);
  const isClickingVertexRef = useRef(false);
  const lastLineClickTimeRef = useRef<number>(0);

  // Get work plane for this polyline
  const workPlanes = workPlanesTableToThree(doc.workPlanes);
  const workPlane = polyline?.workPlaneId
    ? workPlanes.find((wp) => wp.id === polyline.workPlaneId)?.workPlane
    : undefined;

  // Get all selected vertex indices
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

  // Use vertex drag hook
  const {
    draggingVertexIndex,
    clickStartPosRef,
    handleVertexDragStart,
    handleVertexDragEnd,
    handleMouseMove,
    handleMouseUp,
  } = useVertexDrag({
    polylineId,
    polyline,
    workPlane,
    renderer,
    camera,
    raycaster,
    pointer,
    onDraggingChange,
  });

  // Use window selection hook
  const { setSelectionRect } = useVertexWindowSelection({
    polylineId,
    polyline,
    workPlane,
    renderer,
    camera,
    is2D,
    draggingVertexIndex,
    isClickingVertexRef,
  });

  // Vertex pointer down handler
  const handleVertexPointerDown = useVertexPointerDown({
    polylineId,
    polyline,
    isClickingVertexRef,
    clickStartPosRef,
    selectOnly,
    select,
    deselect,
    isSelected,
  });

  // Refs for 2D double-click detection
  const last2DClickTimeRef = useRef<number>(0);
  const last2DClickPosRef = useRef<{ x: number; y: number } | null>(null);

  // Manual click detection for 2D mode using screen-space distance
  useEffect(() => {
    if (!is2D || !polyline) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.target !== renderer.domElement) return;
      if (e.button !== 0) return; // Only left click
      if (draggingVertexIndex !== null) return;

      const rect = renderer.domElement.getBoundingClientRect();
      const clickX = e.clientX;
      const clickY = e.clientY;

      // Check for double-click
      const currentTime = Date.now();
      const timeSinceLastClick = currentTime - last2DClickTimeRef.current;
      const lastPos = last2DClickPosRef.current;
      const isDoubleClick =
        timeSinceLastClick < 300 &&
        lastPos &&
        Math.abs(clickX - lastPos.x) < 10 &&
        Math.abs(clickY - lastPos.y) < 10;

      last2DClickTimeRef.current = currentTime;
      last2DClickPosRef.current = { x: clickX, y: clickY };

      // Check each vertex's screen position
      const count = Math.floor(polyline.polyline.length / 2);
      let closestIndex = -1;
      let closestDistSq = Infinity;
      const hitRadiusSq = 12 * 12; // 12 pixel hit radius

      for (let i = 0; i < count; i++) {
        const vx = polyline.polyline[i * 2];
        const vy = polyline.polyline[i * 2 + 1];

        // Convert vertex to world position
        const worldPos = new THREE.Vector3(vx, vy, 0);
        if (workPlane) {
          workPlane.localToWorld(worldPos);
        }

        // Project to screen
        worldPos.project(camera);
        const screenX = (worldPos.x * 0.5 + 0.5) * rect.width + rect.left;
        const screenY = (-worldPos.y * 0.5 + 0.5) * rect.height + rect.top;

        const dx = clickX - screenX;
        const dy = clickY - screenY;
        const distSq = dx * dx + dy * dy;

        if (distSq < hitRadiusSq && distSq < closestDistSq) {
          closestDistSq = distSq;
          closestIndex = i;
        }
      }

      if (closestIndex >= 0) {
        // Clicked on a vertex
        isClickingVertexRef.current = true;
        requestAnimationFrame(() => {
          isClickingVertexRef.current = false;
        });

        clickStartPosRef.current = { x: e.clientX, y: e.clientY };

        const vertexHandle: VertexHandle = {
          type: "VERTEX",
          polylineId,
          vertexIndex: closestIndex,
        };

        // Handle linked vertices for closed polylines
        const lastIdx = count - 1;
        const isLinkedVertex =
          polyline.closed &&
          count >= 2 &&
          (closestIndex === 0 || closestIndex === lastIdx);
        const linkedIndex = closestIndex === 0 ? lastIdx : 0;
        const linkedHandle: VertexHandle | null = isLinkedVertex
          ? { type: "VERTEX", polylineId, vertexIndex: linkedIndex }
          : null;

        if (e.shiftKey) {
          if (isSelected(vertexHandle)) {
            deselect(vertexHandle);
            if (linkedHandle) deselect(linkedHandle);
          } else {
            select(vertexHandle);
            if (linkedHandle) select(linkedHandle);
          }
        } else {
          selectOnly(vertexHandle);
          if (linkedHandle) select(linkedHandle);
        }

        // Start drag
        setSelectionRect(null);
        handleVertexDragStart(closestIndex);
      } else if (isDoubleClick && count >= 2) {
        // Double-click on empty space - insert vertex
        // Convert screen coords to local coords using unproject (same as 2D drag)
        const ndcX = ((clickX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((clickY - rect.top) / rect.height) * 2 + 1;
        const worldPos = new THREE.Vector3(ndcX, ndcY, 0).unproject(camera);

        let localX = worldPos.x;
        let localY = worldPos.y;
        if (workPlane) {
          workPlane.updateMatrixWorld(true);
          const invMatrix = new THREE.Matrix4()
            .copy(workPlane.matrixWorld)
            .invert();
          worldPos.applyMatrix4(invMatrix);
          localX = worldPos.x;
          localY = worldPos.y;
        }

        const { segmentIndex } = findClosestSegment(
          { x: localX, y: localY },
          polyline.polyline
        );
        const insertIndex = (segmentIndex + 1) * 2;

        updateEntity(polylineHandle, (entity) => {
          const newPolyline = [...entity.polyline];
          newPolyline.splice(insertIndex, 0, localX, localY);
          return { ...entity, polyline: newPolyline };
        });

        const newVertexHandle: VertexHandle = {
          type: "VERTEX",
          polylineId,
          vertexIndex: segmentIndex + 1,
        };
        selectOnly(newVertexHandle);
      }
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    return () => {
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [
    is2D,
    polyline,
    polylineId,
    polylineHandle,
    workPlane,
    camera,
    renderer,
    draggingVertexIndex,
    isClickingVertexRef,
    clickStartPosRef,
    selectOnly,
    select,
    deselect,
    isSelected,
    setSelectionRect,
    handleVertexDragStart,
    updateEntity,
  ]);

  // Mouse event listeners for dragging
  useEffect(() => {
    if (draggingVertexIndex === null) return;

    if (is2D) {
      // 2D mode: use screen-to-world conversion instead of raycasting
      const handle2DMouseMove = (e: MouseEvent) => {
        if (draggingVertexIndex === null || !polyline) return;

        const rect = renderer.domElement.getBoundingClientRect();
        // Convert screen coords to NDC
        const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        // Unproject to world coordinates
        const worldPos = new THREE.Vector3(ndcX, ndcY, 0).unproject(camera);

        // Convert to local coordinates if there's a work plane
        let localX = worldPos.x;
        let localY = worldPos.y;
        if (workPlane) {
          workPlane.updateMatrixWorld(true);
          const invMatrix = new THREE.Matrix4()
            .copy(workPlane.matrixWorld)
            .invert();
          worldPos.applyMatrix4(invMatrix);
          localX = worldPos.x;
          localY = worldPos.y;
        }

        // Apply grid snap
        const { gridSnapMode } = useStore.getState();
        const snapped = gridSnap(localX, localY, gridSnapMode);
        localX = snapped.x;
        localY = snapped.y;

        // Update polyline vertex
        const newPolyline = [...polyline.polyline];
        const vertexCount = Math.floor(newPolyline.length / 2);
        const lastIdx = vertexCount - 1;

        newPolyline[draggingVertexIndex * 2] = localX;
        newPolyline[draggingVertexIndex * 2 + 1] = localY;

        // If closed, link first and last vertices
        if (polyline.closed && vertexCount >= 2) {
          if (draggingVertexIndex === 0) {
            newPolyline[lastIdx * 2] = localX;
            newPolyline[lastIdx * 2 + 1] = localY;
          } else if (draggingVertexIndex === lastIdx) {
            newPolyline[0] = localX;
            newPolyline[1] = localY;
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
      };

      const handle2DMouseUp = () => {
        clickStartPosRef.current = null;
        handleVertexDragEnd();
      };

      renderer.domElement.addEventListener("mousemove", handle2DMouseMove);
      renderer.domElement.addEventListener("mouseup", handle2DMouseUp);
      return () => {
        renderer.domElement.removeEventListener("mousemove", handle2DMouseMove);
        renderer.domElement.removeEventListener("mouseup", handle2DMouseUp);
      };
    } else {
      // 3D mode: use raycasting
      renderer.domElement.addEventListener("mousemove", handleMouseMove);
      renderer.domElement.addEventListener("mouseup", handleMouseUp);
      return () => {
        renderer.domElement.removeEventListener("mousemove", handleMouseMove);
        renderer.domElement.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [
    draggingVertexIndex,
    renderer,
    handleMouseMove,
    handleMouseUp,
    is2D,
    camera,
    workPlane,
    polyline,
    polylineHandle,
    updateEntity,
    handleVertexDragEnd,
    clickStartPosRef,
  ]);

  // Keyboard handlers
  useKeyboardHandlers({
    polylineId,
    polylineHandle,
    polyline,
    hasSelectedVertices,
    selectedVertexIndices,
    updateEntity,
    setEditingPolylineId,
    clearSelection,
    select,
  });

  // Double-click to insert vertex
  const handleLineDoubleClick = useLineDoubleClick({
    polyline,
    polylineId,
    polylineHandle,
    workPlane,
    renderer,
    camera,
    raycaster,
    pointer,
    updateEntity,
    selectOnly,
    lastLineClickTimeRef,
  });

  if (!polyline) return null;

  // Get vertices for rendering
  const vertices: THREE.Vector3[] = [];
  const count = Math.floor(polyline.polyline.length / 2);
  for (let i = 0; i < count; i++) {
    const x = polyline.polyline[i * 2];
    const y = polyline.polyline[i * 2 + 1];
    vertices.push(new THREE.Vector3(x, y, 0));
  }

  const vertexHandles = vertices.map((vertex, index) => (
    <VertexHandle
      key={index}
      vertex={vertex}
      vertexIndex={index}
      polylineId={polylineId}
      isSelected={selectedVertexIndices.includes(index)}
      onDragStart={() => {
        setSelectionRect(null);
        handleVertexDragStart(index);
      }}
      onPointerDown={(e) => handleVertexPointerDown(index, e)}
    />
  ));

  const clickPlane = (
    <mesh
      visible={false}
      onPointerDown={handleLineDoubleClick}
      position={[0, 0, -0.1]}
    >
      <planeGeometry args={[1000, 1000]} />
      <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );

  if (workPlane) {
    return (
      <primitive object={workPlane}>
        {vertexHandles}
        {clickPlane}
      </primitive>
    );
  }

  return (
    <>
      {vertexHandles}
      {clickPlane}
    </>
  );
}

// Keyboard handlers hook
function useKeyboardHandlers({
  polylineId,
  polylineHandle,
  polyline,
  hasSelectedVertices,
  selectedVertexIndices,
  updateEntity,
  setEditingPolylineId,
  clearSelection,
  select,
}: {
  polylineId: PolylineId;
  polylineHandle: PolylineHandle;
  polyline: PolylineEntity | undefined;
  hasSelectedVertices: boolean;
  selectedVertexIndices: number[];
  updateEntity: ReturnType<typeof useStore.getState>["updateEntity"];
  setEditingPolylineId: (id: PolylineId | null) => void;
  clearSelection: () => void;
  select: ReturnType<typeof useStore.getState>["select"];
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (hasSelectedVertices) {
          clearSelection();
        } else {
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

        if (polyline.closed) {
          updateEntity(polylineHandle, (entity) => ({
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
          Math.abs(firstX - lastX) < 0.001 && Math.abs(firstY - lastY) < 0.001;

        let newLastIdx: number;

        if (alreadyOverlapping) {
          updateEntity(polylineHandle, (entity) => ({
            ...entity,
            closed: true,
          }));
          newLastIdx = vertexCount - 1;
        } else {
          updateEntity(polylineHandle, (entity) => {
            const newPolyline = [...entity.polyline, firstX, firstY];
            return {
              ...entity,
              polyline: newPolyline,
              closed: true,
            };
          });
          newLastIdx = vertexCount;
        }

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

      // Delete selected vertices
      if (e.key === "Delete" || e.key === "Backspace") {
        if (hasSelectedVertices && polyline) {
          e.preventDefault();

          const vertexCount = Math.floor(polyline.polyline.length / 2);
          const lastIdx = vertexCount - 1;

          if (polyline.closed) {
            // For closed polylines, treat first and last as the same vertex
            const indicesToDelete = new Set(selectedVertexIndices);
            if (indicesToDelete.has(0) || indicesToDelete.has(lastIdx)) {
              indicesToDelete.add(0);
              indicesToDelete.add(lastIdx);
            }

            // Count unique vertices (exclude duplicated last vertex)
            const uniqueCount = lastIdx; // vertices 0 to lastIdx-1 are unique
            const deletedCount = [...indicesToDelete].filter(
              (i) => i < lastIdx
            ).length;
            const remainingCount = uniqueCount - deletedCount;

            if (remainingCount >= 2) {
              // Find first non-deleted vertex to start from
              let newStartIdx = -1;
              for (let i = 0; i < lastIdx; i++) {
                if (!indicesToDelete.has(i)) {
                  newStartIdx = i;
                  break;
                }
              }

              if (newStartIdx >= 0) {
                // Build new polyline rotating to start from newStartIdx
                const newPolyline: number[] = [];
                for (let i = 0; i < lastIdx; i++) {
                  const srcIdx = (newStartIdx + i) % lastIdx;
                  if (!indicesToDelete.has(srcIdx)) {
                    newPolyline.push(
                      polyline.polyline[srcIdx * 2],
                      polyline.polyline[srcIdx * 2 + 1]
                    );
                  }
                }
                // Duplicate first vertex at end for closure
                newPolyline.push(newPolyline[0], newPolyline[1]);

                updateEntity(polylineHandle, (entity) => ({
                  ...entity,
                  polyline: newPolyline,
                  closed: true,
                }));
                clearSelection();
              }
            }
          } else {
            // For open polylines, just remove vertices in reverse order
            const sortedIndices = [...selectedVertexIndices].sort(
              (a, b) => b - a
            );

            if (vertexCount - sortedIndices.length >= 2) {
              const newPolyline = [...polyline.polyline];
              for (const idx of sortedIndices) {
                newPolyline.splice(idx * 2, 2);
              }
              updateEntity(polylineHandle, (entity) => ({
                ...entity,
                polyline: newPolyline,
              }));
              clearSelection();
            }
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
    polylineHandle,
    updateEntity,
    setEditingPolylineId,
    clearSelection,
    select,
  ]);
}

// Double-click to insert vertex hook
function useLineDoubleClick({
  polyline,
  polylineId,
  polylineHandle,
  workPlane,
  renderer,
  camera,
  raycaster,
  pointer,
  updateEntity,
  selectOnly,
  lastLineClickTimeRef,
}: {
  polyline: PolylineEntity | undefined;
  polylineId: PolylineId;
  polylineHandle: PolylineHandle;
  workPlane: THREE.Object3D | undefined;
  renderer: THREE.WebGLRenderer;
  camera: THREE.Camera;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  updateEntity: ReturnType<typeof useStore.getState>["updateEntity"];
  selectOnly: ReturnType<typeof useStore.getState>["selectOnly"];
  lastLineClickTimeRef: React.MutableRefObject<number>;
}) {
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

      updateEntity(polylineHandle, (entity) => {
        const newPolyline = [...entity.polyline];
        newPolyline.splice(insertIndex, 0, localPoint.x, localPoint.y);
        return {
          ...entity,
          polyline: newPolyline,
        };
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
      updateEntity,
      selectOnly,
      lastLineClickTimeRef,
    ]
  );
}

// Vertex pointer down handler
function useVertexPointerDown({
  polylineId,
  polyline,
  isClickingVertexRef,
  clickStartPosRef,
  selectOnly,
  select,
  deselect,
  isSelected,
}: {
  polylineId: PolylineId;
  polyline: PolylineEntity | undefined;
  isClickingVertexRef: React.MutableRefObject<boolean>;
  clickStartPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
  selectOnly: ReturnType<typeof useStore.getState>["selectOnly"];
  select: ReturnType<typeof useStore.getState>["select"];
  deselect: ReturnType<typeof useStore.getState>["deselect"];
  isSelected: ReturnType<typeof useStore.getState>["isSelected"];
}) {
  return useCallback(
    (vertexIndex: number, e: any) => {
      isClickingVertexRef.current = true;
      requestAnimationFrame(() => {
        isClickingVertexRef.current = false;
      });

      clickStartPosRef.current = {
        x: e.clientX ?? e.nativeEvent?.clientX,
        y: e.clientY ?? e.nativeEvent?.clientY,
      };

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

      const shiftKey = e.shiftKey ?? e.nativeEvent?.shiftKey;
      if (shiftKey) {
        if (isSelected(vertexHandle)) {
          deselect(vertexHandle);
          if (linkedHandle) deselect(linkedHandle);
        } else {
          select(vertexHandle);
          if (linkedHandle) select(linkedHandle);
        }
      } else {
        selectOnly(vertexHandle);
        if (linkedHandle) select(linkedHandle);
      }
    },
    [
      polylineId,
      polyline,
      isClickingVertexRef,
      clickStartPosRef,
      selectOnly,
      select,
      deselect,
      isSelected,
    ]
  );
}

// Vertex handle component
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
  const groupRef = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    if (groupRef.current) {
      // Get world position of the group (important when it's a child of work plane)
      const worldPos = new THREE.Vector3();
      groupRef.current.getWorldPosition(worldPos);

      // Calculate world units per pixel for screen-space scaling
      let worldUnitsPerPixel: number;
      if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
        const orthoCamera = camera as THREE.OrthographicCamera;
        // Use height for consistency with perspective calculation
        const visibleHeight =
          (orthoCamera.top - orthoCamera.bottom) / orthoCamera.zoom;
        worldUnitsPerPixel = visibleHeight / size.height;
      } else {
        // For perspective camera, use distance-based scaling with world position
        const distance = camera.position.distanceTo(worldPos);
        const fov = (camera as THREE.PerspectiveCamera).fov || 75;
        const vFov = (fov * Math.PI) / 180;
        const visibleHeight = 2 * Math.tan(vFov / 2) * distance;
        worldUnitsPerPixel = visibleHeight / size.height;
      }

      // ~3 pixel radius sphere (geometry has 0.05 base radius, so scale accordingly)
      const pixelSize = 3;
      const scale = (pixelSize * worldUnitsPerPixel) / 0.05;
      if (scale > 0 && isFinite(scale)) {
        groupRef.current.scale.setScalar(scale);
      }
    }
  });

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.color.setHex(
        isSelected ? colors.selection.highlight : 0xffffff
      );
    }
  }, [isSelected]);

  return (
    <group ref={groupRef} position={vertex}>
      {/* Transparent larger hit area for easier clicking */}
      <mesh
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDown(e);
          onDragStart();
        }}
        userData={{ handleHash: vertexHandleToHash(handle) }}
      >
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Visible smaller sphere */}
      <mesh>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial
          ref={materialRef}
          color={isSelected ? colors.selection.highlight : 0xffffff}
        />
      </mesh>
    </group>
  );
}
