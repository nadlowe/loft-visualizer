"use client";

import { workPlaneTableToRendered } from "@/lib/canvas/render/renderWorkPlane";
import { handleNew } from "@/lib/entity/handleTools/handleNew";
import { useVertexDrag } from "@/lib/hooks/useVertexDrag";
import { useVertexWindowSelection } from "@/lib/hooks/useVertexWindowSelection";
import { useStore } from "@/lib/state/useStore";
import { PolylineId } from "@/lib/util/uid";
import { useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { use2DClickDetection } from "./use2DClickDetection";
import { useDragEventListeners } from "./useDragEventListeners";
import { useKeyboardHandlers } from "./useKeyboardHandlers";
import { useLineDoubleClick } from "./useLineDoubleClick";
import { useVertexPointerDown } from "./useVertexPointerDown";
import { VertexHandle as VertexHandleComponent } from "./VertexHandle";

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
  const workPlanes = workPlaneTableToRendered(doc.workPlanes);
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

  // Vertex drag hook
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

  // Window selection hook
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

  // 2D click detection (vertex selection + double-click insert)
  use2DClickDetection({
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
  });

  // Drag event listeners (2D and 3D modes)
  useDragEventListeners({
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
  });

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
    selectOnly,
    select,
  });

  // Double-click to insert vertex (3D mode)
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
    <VertexHandleComponent
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
