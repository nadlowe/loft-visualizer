"use client";

import { handleNew } from "@/lib/entity/handle";
import { useStore } from "@/lib/state/useStore";
import { PolylineId, uid } from "@/lib/util/uid";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PreviewPolyline } from "./PreviewPolyline";

export function PolylineDrawing() {
  const { camera, raycaster, pointer, gl } = useThree();
  const { cmd, addVertex, finishDrawPolyline, addPolyline, doc, selectOnly } =
    useStore();
  const [hoverPosition, setHoverPosition] = useState<THREE.Vector3 | null>(
    null
  );
  const lastClickTimeRef = useRef<number>(0);
  const lastClickPositionRef = useRef<THREE.Vector3 | null>(null);

  useFrame(() => {
    if (cmd?.type === "DRAW_POLYLINE") {
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersection = new THREE.Vector3();
      raycaster.setFromCamera(pointer, camera);

      if (raycaster.ray.intersectPlane(plane, intersection)) {
        setHoverPosition(intersection.clone());
      } else {
        setHoverPosition(null);
      }
    } else {
      setHoverPosition(null);
    }
  });

  useEffect(() => {
    if (cmd?.type === "DRAW_POLYLINE") {
      gl.domElement.style.cursor = "crosshair";
      const handlePointerDown = (e: PointerEvent) => {
        if (e.target === gl.domElement) {
          const rect = gl.domElement.getBoundingClientRect();
          pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

          const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
          const intersection = new THREE.Vector3();
          raycaster.setFromCamera(pointer, camera);

          if (raycaster.ray.intersectPlane(plane, intersection)) {
            const vertex: [number, number] = [intersection.x, intersection.y];

            const currentTime = Date.now();
            const timeSinceLastClick = currentTime - lastClickTimeRef.current;
            const isDoubleClick =
              timeSinceLastClick < 300 &&
              lastClickPositionRef.current &&
              intersection.distanceTo(lastClickPositionRef.current) < 0.1 &&
              cmd.vertices.length > 0;

            if (isDoubleClick && cmd.vertices.length >= 2) {
              const polylineFlat = cmd.vertices.flat();
              const polylineCount = Object.keys(doc.polylines).length;
              const polylineId = uid<PolylineId>();
              const newPolyline = {
                id: polylineId,
                type: "POLYLINE" as const,
                name: `Polyline ${polylineCount + 1}`,
                polyline: polylineFlat,
              };
              addPolyline(newPolyline);
              const handle = handleNew("POLYLINE", polylineId);
              selectOnly(handle);
              finishDrawPolyline();
              lastClickTimeRef.current = 0;
              lastClickPositionRef.current = null;
            } else {
              addVertex(vertex);
              lastClickTimeRef.current = currentTime;
              lastClickPositionRef.current = intersection.clone();
            }
          }
        }
      };

      gl.domElement.addEventListener("pointerdown", handlePointerDown);
      return () => {
        gl.domElement.removeEventListener("pointerdown", handlePointerDown);
        gl.domElement.style.cursor = "default";
      };
    } else {
      gl.domElement.style.cursor = "default";
    }
  }, [
    cmd,
    gl,
    camera,
    raycaster,
    pointer,
    doc,
    addVertex,
    finishDrawPolyline,
    addPolyline,
    selectOnly,
  ]);

  if (cmd?.type !== "DRAW_POLYLINE") {
    return null;
  }

  return (
    <PreviewPolyline vertices={cmd.vertices} hoverPosition={hoverPosition} />
  );
}
