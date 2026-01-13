import { PolylineEntity } from "@/lib/entity/polylineEntity";
import { gridSnap } from "@/lib/snap/gridSnap";
import { PolylineId } from "@/lib/util/uid";
import { useStore } from "@/store/useStore";
import { useEffect } from "react";
import * as THREE from "three";

interface UseDragEventListenersProps {
  draggingVertexIndex: number | null;
  renderer: THREE.WebGLRenderer;
  handleMouseMove: (e: MouseEvent) => void;
  handleMouseUp: (e: MouseEvent) => void;
  is2D: boolean;
  camera: THREE.Camera;
  workPlane: THREE.Object3D | undefined;
  polyline: PolylineEntity | undefined;
  polylineHandle: { type: "POLYLINE"; id: PolylineId };
  updateEntity: ReturnType<typeof useStore.getState>["updateEntity"];
  handleVertexDragEnd: () => void;
  clickStartPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
}

export function useDragEventListeners({
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
}: UseDragEventListenersProps) {
  useEffect(() => {
    if (draggingVertexIndex === null) return;

    if (is2D) {
      const handle2DMouseMove = create2DMouseMoveHandler(
        draggingVertexIndex,
        polyline,
        renderer,
        camera,
        workPlane,
        polylineHandle,
        updateEntity
      );

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
}

function create2DMouseMoveHandler(
  draggingVertexIndex: number,
  polyline: PolylineEntity | undefined,
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  workPlane: THREE.Object3D | undefined,
  polylineHandle: { type: "POLYLINE"; id: PolylineId },
  updateEntity: ReturnType<typeof useStore.getState>["updateEntity"]
) {
  return (e: MouseEvent) => {
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
}
