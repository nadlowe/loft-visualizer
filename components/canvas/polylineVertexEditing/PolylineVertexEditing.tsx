"use client";

import { workPlaneTableToRendered } from "@/lib/canvas/render/renderWorkPlane";
import { findClosestSegment } from "@/lib/canvas/vertexEditingUtils";
import { handleNew } from "@/lib/entity/handleTools/handleNew";
import type { VertexHandle } from "@/lib/entity/handleTypes";
import { useVertexDrag } from "@/lib/hooks/useVertexDrag";
import { useVertexWindowSelection } from "@/lib/hooks/useVertexWindowSelection";
import { gridSnap } from "@/lib/snap/gridSnap";
import { useStore } from "@/lib/state/useStore";
import { PolylineId } from "@/lib/util/uid";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
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
      if (e.button !== 0) return;
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
      const hitRadiusSq = 12 * 12;

      for (let i = 0; i < count; i++) {
        const vx = polyline.polyline[i * 2];
        const vy = polyline.polyline[i * 2 + 1];

        const worldPos = new THREE.Vector3(vx, vy, 0);
        if (workPlane) {
          workPlane.localToWorld(worldPos);
        }

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

        setSelectionRect(null);
        handleVertexDragStart(closestIndex);
      } else if (isDoubleClick && count >= 2) {
        // Double-click on empty space - insert vertex
        const ndcX = ((clickX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((clickY - rect.top) / rect.height) * 2 + 1;
        const worldPos = new THREE.Vector3(ndcX, ndcY, 0).unproject(camera);

        const { gridSnapMode } = useStore.getState();
        const snapped = gridSnap(worldPos.x, worldPos.y, gridSnapMode);

        let localX: number;
        let localY: number;
        if (workPlane) {
          workPlane.updateMatrixWorld(true);
          const rayOrigin = new THREE.Vector3(snapped.x, snapped.y, 100);
          const rayDir = new THREE.Vector3(0, 0, -1);
          camera.getWorldDirection(rayDir);
          rayDir.normalize();

          const planeNormal = new THREE.Vector3(0, 0, 1).applyMatrix4(
            new THREE.Matrix4().extractRotation(workPlane.matrixWorld)
          );
          const planePoint = new THREE.Vector3().setFromMatrixPosition(
            workPlane.matrixWorld
          );
          const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
            planeNormal,
            planePoint
          );

          const ray = new THREE.Ray(rayOrigin, rayDir);
          const intersection = new THREE.Vector3();
          if (ray.intersectPlane(plane, intersection)) {
            const invMatrix = new THREE.Matrix4()
              .copy(workPlane.matrixWorld)
              .invert();
            intersection.applyMatrix4(invMatrix);
            localX = intersection.x;
            localY = intersection.y;
          } else {
            localX = snapped.x;
            localY = snapped.y;
          }
        } else {
          localX = snapped.x;
          localY = snapped.y;
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
      const handle2DMouseMove = (e: MouseEvent) => {
        if (draggingVertexIndex === null || !polyline) return;

        const rect = renderer.domElement.getBoundingClientRect();
        const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const worldPos = new THREE.Vector3(ndcX, ndcY, 0).unproject(camera);

        const { gridSnapMode } = useStore.getState();
        const snapped = gridSnap(worldPos.x, worldPos.y, gridSnapMode);

        let localX: number;
        let localY: number;
        if (workPlane) {
          workPlane.updateMatrixWorld(true);
          const rayOrigin = new THREE.Vector3(snapped.x, snapped.y, 100);
          const rayDir = new THREE.Vector3(0, 0, -1);
          camera.getWorldDirection(rayDir);
          rayDir.normalize();

          const planeNormal = new THREE.Vector3(0, 0, 1).applyMatrix4(
            new THREE.Matrix4().extractRotation(workPlane.matrixWorld)
          );
          const planePoint = new THREE.Vector3().setFromMatrixPosition(
            workPlane.matrixWorld
          );
          const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
            planeNormal,
            planePoint
          );

          const ray = new THREE.Ray(rayOrigin, rayDir);
          const intersection = new THREE.Vector3();
          if (ray.intersectPlane(plane, intersection)) {
            const invMatrix = new THREE.Matrix4()
              .copy(workPlane.matrixWorld)
              .invert();
            intersection.applyMatrix4(invMatrix);
            localX = intersection.x;
            localY = intersection.y;
          } else {
            localX = snapped.x;
            localY = snapped.y;
          }
        } else {
          localX = snapped.x;
          localY = snapped.y;
        }

        const newPolyline = [...polyline.polyline];
        const vertexCount = Math.floor(newPolyline.length / 2);
        const lastIdx = vertexCount - 1;

        newPolyline[draggingVertexIndex * 2] = localX;
        newPolyline[draggingVertexIndex * 2 + 1] = localY;

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
