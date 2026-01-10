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

  // Mouse event listeners for dragging
  useEffect(() => {
    if (draggingVertexIndex !== null) {
      renderer.domElement.addEventListener("mousemove", handleMouseMove);
      renderer.domElement.addEventListener("mouseup", handleMouseUp);
      return () => {
        renderer.domElement.removeEventListener("mousemove", handleMouseMove);
        renderer.domElement.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [draggingVertexIndex, renderer, handleMouseMove, handleMouseUp]);

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
    <mesh visible={false} onPointerDown={handleLineDoubleClick}>
      <planeGeometry args={[1000, 1000]} />
      <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );

  if (workPlane) {
    return (
      <primitive object={workPlane}>
        {clickPlane}
        {vertexHandles}
      </primitive>
    );
  }

  return (
    <>
      {clickPlane}
      {vertexHandles}
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

          const newPolyline = [...polyline.polyline];
          const vertexCount = Math.floor(newPolyline.length / 2);
          const lastIdx = vertexCount - 1;

          const sortedIndices = [...selectedVertexIndices].sort(
            (a, b) => b - a
          );

          if (vertexCount - sortedIndices.length >= 2) {
            const deletingJoinedVertex =
              polyline.closed &&
              (sortedIndices.includes(0) || sortedIndices.includes(lastIdx));

            for (const idx of sortedIndices) {
              newPolyline.splice(idx * 2, 2);
            }
            updateEntity(polylineHandle, (entity) => ({
              ...entity,
              polyline: newPolyline,
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
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    if (meshRef.current) {
      const distance = camera.position.distanceTo(meshRef.current.position);
      const scale = distance * 0.1;
      meshRef.current.scale.setScalar(scale);
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
