"use client";

import { handleNew } from "@/lib/entity/handle";
import { snapToVertices } from "@/lib/snap/snapToVertices";
import { useStore } from "@/lib/state/useStore";
import { PolylineId, uid } from "@/lib/util/uid";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PolylineCmdPreview } from "./PolylineCmdPreview";

export function PolylineCmd() {
  const { camera, raycaster, pointer, gl } = useThree();
  const {
    cmd,
    addVertex,
    finishDrawPolyline,
    addPolyline,
    doc,
    selectOnly,
    snapEnabled,
  } = useStore();
  const [hoverPosition, setHoverPosition] = useState<THREE.Vector3 | null>(
    null
  );
  const lastClickTimeRef = useRef<number>(0);
  const lastClickPositionRef = useRef<THREE.Vector3 | null>(null);

  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  const intersectPlane = useCallback((): THREE.Vector3 | null => {
    const intersection = new THREE.Vector3();
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(plane, intersection)) {
      return intersection;
    }
    return null;
  }, [camera, pointer, raycaster]);

  const handleDoubleClick = useCallback(
    (hit: THREE.Vector3) => {
      if (!cmd || cmd.type !== "DRAW_POLYLINE" || cmd.vertices.length < 2) {
        return;
      }

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
    },
    [cmd, doc.polylines, addPolyline, selectOnly, finishDrawPolyline]
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.target !== gl.domElement || cmd?.type !== "DRAW_POLYLINE") {
        return;
      }

      const rect = gl.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const hit = intersectPlane();
      if (!hit) {
        return;
      }

      const currentTime = Date.now();
      const timeSinceLastClick = currentTime - lastClickTimeRef.current;
      const isDoubleClick =
        timeSinceLastClick < 300 &&
        lastClickPositionRef.current &&
        hit.distanceTo(lastClickPositionRef.current) < 0.1 &&
        cmd.vertices.length > 0;

      if (isDoubleClick && cmd.vertices.length >= 2) {
        handleDoubleClick(hit);
        return;
      }

      // Apply snapping if enabled (no workPlaneId for standalone polylines)
      let x = hit.x;
      let y = hit.y;
      if (snapEnabled) {
        const snapResult = snapToVertices(
          { x, y },
          undefined,
          doc.polylines,
          undefined,
          undefined
        );
        if (snapResult.snapped) {
          x = snapResult.point.x;
          y = snapResult.point.y;
        }
      }

      addVertex([x, y]);
      lastClickTimeRef.current = currentTime;
      lastClickPositionRef.current = hit.clone();
    },
    [
      cmd,
      gl.domElement,
      pointer,
      intersectPlane,
      handleDoubleClick,
      addVertex,
      snapEnabled,
      doc.polylines,
    ]
  );

  useFrame(() => {
    if (cmd?.type !== "DRAW_POLYLINE") {
      setHoverPosition(null);
      return;
    }
    setHoverPosition(intersectPlane());
  });

  useEffect(() => {
    if (cmd?.type !== "DRAW_POLYLINE") {
      gl.domElement.style.cursor = "default";
      return;
    }

    gl.domElement.style.cursor = "crosshair";
    gl.domElement.addEventListener("pointerdown", handlePointerDown);
    return () => {
      gl.domElement.removeEventListener("pointerdown", handlePointerDown);
      gl.domElement.style.cursor = "default";
    };
  }, [cmd?.type, gl.domElement, handlePointerDown]);

  if (cmd?.type !== "DRAW_POLYLINE") {
    return null;
  }

  return (
    <PolylineCmdPreview vertices={cmd.vertices} hoverPosition={hoverPosition} />
  );
}
