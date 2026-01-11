import { findClosestSegment } from "@/lib/canvas/vertexEditingUtils";
import type { VertexHandle } from "@/lib/entity/handleTypes";
import { PolylineEntity } from "@/lib/entity/polylineEntity";
import { gridSnap } from "@/lib/snap/gridSnap";
import { useStore } from "@/lib/state/useStore";
import { PolylineId } from "@/lib/util/uid";
import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Use2DClickDetectionProps {
  is2D: boolean;
  polyline: PolylineEntity | undefined;
  polylineId: PolylineId;
  polylineHandle: { type: "POLYLINE"; id: PolylineId };
  workPlane: THREE.Object3D | undefined;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  draggingVertexIndex: number | null;
  isClickingVertexRef: React.MutableRefObject<boolean>;
  clickStartPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
  selectOnly: ReturnType<typeof useStore.getState>["selectOnly"];
  select: ReturnType<typeof useStore.getState>["select"];
  deselect: ReturnType<typeof useStore.getState>["deselect"];
  isSelected: ReturnType<typeof useStore.getState>["isSelected"];
  setSelectionRect: (rect: null) => void;
  handleVertexDragStart: (index: number) => void;
  updatePolylineVertices: ReturnType<
    typeof useStore.getState
  >["updatePolylineVertices"];
}

export function use2DClickDetection({
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
  updatePolylineVertices,
}: Use2DClickDetectionProps) {
  const last2DClickTimeRef = useRef<number>(0);
  const last2DClickPosRef = useRef<{ x: number; y: number } | null>(null);

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

      // Find closest vertex
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
        handleVertexClick(
          closestIndex,
          e,
          polyline,
          polylineId,
          isClickingVertexRef,
          clickStartPosRef,
          selectOnly,
          select,
          deselect,
          isSelected,
          setSelectionRect,
          handleVertexDragStart
        );
      } else if (isDoubleClick && count >= 2) {
        handleDoubleClickInsert(
          clickX,
          clickY,
          rect,
          camera,
          workPlane,
          polyline,
          polylineId,
          polylineHandle,
          updatePolylineVertices,
          selectOnly
        );
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
    updatePolylineVertices,
  ]);
}

function handleVertexClick(
  closestIndex: number,
  e: PointerEvent,
  polyline: PolylineEntity,
  polylineId: PolylineId,
  isClickingVertexRef: React.MutableRefObject<boolean>,
  clickStartPosRef: React.MutableRefObject<{ x: number; y: number } | null>,
  selectOnly: ReturnType<typeof useStore.getState>["selectOnly"],
  select: ReturnType<typeof useStore.getState>["select"],
  deselect: ReturnType<typeof useStore.getState>["deselect"],
  isSelected: ReturnType<typeof useStore.getState>["isSelected"],
  setSelectionRect: (rect: null) => void,
  handleVertexDragStart: (index: number) => void
) {
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

  const count = Math.floor(polyline.polyline.length / 2);
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
}

function handleDoubleClickInsert(
  clickX: number,
  clickY: number,
  rect: DOMRect,
  camera: THREE.Camera,
  workPlane: THREE.Object3D | undefined,
  polyline: PolylineEntity,
  polylineId: PolylineId,
  polylineHandle: { type: "POLYLINE"; id: PolylineId },
  updatePolylineVertices: ReturnType<
    typeof useStore.getState
  >["updatePolylineVertices"],
  selectOnly: ReturnType<typeof useStore.getState>["selectOnly"]
) {
  const ndcX = ((clickX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((clickY - rect.top) / rect.height) * 2 + 1;
  const worldPos = new THREE.Vector3(ndcX, ndcY, 0).unproject(camera);

  const { gridSnapMode } = useStore.getState();
  const snapped = gridSnap(worldPos.x, worldPos.y, gridSnapMode);

  let localX: number;
  let localY: number;
  if (workPlane) {
    (workPlane as THREE.Group).updateMatrixWorld(true);
    const rayOrigin = new THREE.Vector3(snapped.x, snapped.y, 100);
    const rayDir = new THREE.Vector3(0, 0, -1);
    camera.getWorldDirection(rayDir);
    rayDir.normalize();

    const planeNormal = new THREE.Vector3(0, 0, 1).applyMatrix4(
      new THREE.Matrix4().extractRotation(
        (workPlane as THREE.Group).matrixWorld
      )
    );
    const planePoint = new THREE.Vector3().setFromMatrixPosition(
      (workPlane as THREE.Group).matrixWorld
    );
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      planeNormal,
      planePoint
    );

    const ray = new THREE.Ray(rayOrigin, rayDir);
    const intersection = new THREE.Vector3();
    if (ray.intersectPlane(plane, intersection)) {
      const invMatrix = new THREE.Matrix4()
        .copy((workPlane as THREE.Group).matrixWorld)
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

  const newPolyline = [...polyline.polyline];
  newPolyline.splice(insertIndex, 0, localX, localY);

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
}
