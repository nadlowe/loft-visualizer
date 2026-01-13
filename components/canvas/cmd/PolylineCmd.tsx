"use client";

import { Doc } from "@/lib/doc/doc";
import { Entity } from "@/lib/entity/entity";
import { polylineNew } from "@/lib/entity/entityTools/entityNew";
import { entityName } from "@/lib/entity/entityTools/entityTypeToName";
import { SelectableHandle } from "@/lib/entity/handleTypes";
import { Vec2 } from "@/lib/geom/geomTypes";
import { gridSnap } from "@/lib/snap/gridSnap";
import { snapToVertices } from "@/lib/snap/snapToVertices";
import { Cmd } from "@/store/cmd/cmdSlice";
import { GridSnapMode, useStore } from "@/store/useStore";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PolylineCmdPreview } from "./PolylineCmdPreview";

const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

export function PolylineCmd() {
  const { camera, raycaster, pointer, gl: renderer } = useThree();
  const {
    cmd,
    addVertex,
    finishCmd,
    addEntity,
    doc,
    selectOnly,
    snapEnabled,
    gridSnapMode,
  } = useStore();

  const lastClickTimeRef = useRef<number>(0);
  const lastClickPositionRef = useRef<THREE.Vector3 | null>(null);
  const [hoverPosition, setHoverPosition] = useState<THREE.Vector3 | null>(
    null
  );
  const [snapPosition, setSnapPosition] = useState<THREE.Vector3 | null>(null);

  const intersectPlane = useIntersectPlane({ raycaster, pointer, camera });

  const handleDoubleClick = useHandleDoubleClick({
    cmd,
    doc,
    addEntity,
    selectOnly,
    finishCmd,
    lastClickTimeRef,
    lastClickPositionRef,
  });

  const handlePointerDown = useHandlePointerDown({
    renderer,
    cmd,
    intersectPlane,
    lastClickTimeRef,
    lastClickPositionRef,
    snapEnabled,
    gridSnapMode,
    doc,
    addVertex,
    handleDoubleClick,
  });

  useHoverPosition({
    cmd,
    intersectPlane,
    setHoverPosition,
    setSnapPosition,
    gridSnapMode,
    snapEnabled,
    doc,
  });

  usePointerEventListeners({
    renderer,
    cmd,
    handlePointerDown,
  });

  if (cmd?.type !== "DRAW_POLYLINE") {
    return null;
  }

  return (
    <PolylineCmdPreview
      vertices={cmd.vertices}
      hoverPosition={hoverPosition}
      snapPosition={snapPosition}
      closeLoop={cmd.closeLoop}
    />
  );
}

function useIntersectPlane({
  raycaster,
  pointer,
  camera,
}: {
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  camera: THREE.Camera;
}) {
  return useCallback(
    (customPointer?: THREE.Vector2): THREE.Vector3 | null => {
      const intersection = new THREE.Vector3();
      raycaster.setFromCamera(customPointer || pointer, camera);
      if (raycaster.ray.intersectPlane(GROUND_PLANE, intersection)) {
        return intersection;
      }
      return null;
    },
    [camera, pointer, raycaster]
  );
}

function useHandleDoubleClick({
  cmd,
  doc,
  addEntity,
  finishCmd,
  lastClickTimeRef,
  lastClickPositionRef,
}: {
  cmd: Cmd | null;
  doc: Doc;
  addEntity: (entity: Entity) => void;
  selectOnly: (handle: SelectableHandle) => void;
  finishCmd: () => void;
  lastClickTimeRef: React.MutableRefObject<number>;
  lastClickPositionRef: React.MutableRefObject<THREE.Vector3 | null>;
}) {
  return useCallback(() => {
    if (!cmd || cmd.type !== "DRAW_POLYLINE" || cmd.vertices.length < 2) {
      return;
    }

    let polylineCoords = cmd.vertices.flat();

    // If closing loop, add the first vertex at the end
    if (cmd.closeLoop && cmd.vertices.length >= 2) {
      const firstVertex = cmd.vertices[0];
      polylineCoords = [...polylineCoords, firstVertex[0], firstVertex[1]];
    }

    const newPolyline = polylineNew(
      polylineCoords,
      entityName(doc, "POLYLINE"),
      cmd.closeLoop && cmd.vertices.length >= 2
    );
    addEntity(newPolyline);
    finishCmd();
    lastClickTimeRef.current = 0;
    lastClickPositionRef.current = null;
  }, [cmd, doc, addEntity, finishCmd, lastClickTimeRef, lastClickPositionRef]);
}

function useHandlePointerDown({
  renderer,
  cmd,
  intersectPlane,
  lastClickTimeRef,
  lastClickPositionRef,
  snapEnabled,
  gridSnapMode,
  doc,
  addVertex,
  handleDoubleClick,
}: {
  renderer: THREE.WebGLRenderer;
  cmd: Cmd | null;
  intersectPlane: (customPointer?: THREE.Vector2) => THREE.Vector3 | null;
  lastClickTimeRef: React.MutableRefObject<number>;
  lastClickPositionRef: React.MutableRefObject<THREE.Vector3 | null>;
  snapEnabled: boolean;
  gridSnapMode: GridSnapMode;
  doc: Doc;
  addVertex: (vertex: Vec2) => void;
  handleDoubleClick: () => void;
}) {
  return useCallback(
    (e: PointerEvent) => {
      if (e.target !== renderer.domElement || cmd?.type !== "DRAW_POLYLINE") {
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      const currentPointer = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const hit = intersectPlane(currentPointer);
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
        handleDoubleClick();
        return;
      }

      let x = hit.x;
      let y = hit.y;

      // Apply grid snap first (snaps to world grid)
      const gridSnapped = gridSnap(x, y, gridSnapMode);
      x = gridSnapped.x;
      y = gridSnapped.y;

      // Then apply vertex snap if enabled
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
      renderer,
      cmd,
      intersectPlane,
      lastClickTimeRef,
      lastClickPositionRef,
      snapEnabled,
      gridSnapMode,
      doc.polylines,
      addVertex,
      handleDoubleClick,
    ]
  );
}

function useHoverPosition({
  cmd,
  intersectPlane,
  setHoverPosition,
  setSnapPosition,
  gridSnapMode,
  snapEnabled,
  doc,
}: {
  cmd: Cmd | null;
  intersectPlane: () => THREE.Vector3 | null;
  setHoverPosition: React.Dispatch<React.SetStateAction<THREE.Vector3 | null>>;
  setSnapPosition: React.Dispatch<React.SetStateAction<THREE.Vector3 | null>>;
  gridSnapMode: GridSnapMode;
  snapEnabled: boolean;
  doc: Doc;
}) {
  useFrame(() => {
    if (cmd?.type !== "DRAW_POLYLINE") {
      setHoverPosition(null);
      setSnapPosition(null);
      return;
    }

    const hit = intersectPlane();
    setHoverPosition(hit);

    if (!hit) {
      setSnapPosition(null);
      return;
    }

    // Compute snapped position
    let x = hit.x;
    let y = hit.y;

    // Only show snap indicator when grid snap is enabled
    if (gridSnapMode === "OFF") {
      setSnapPosition(null);
      return;
    }

    // Apply grid snap first
    const gridSnapped = gridSnap(x, y, gridSnapMode);
    x = gridSnapped.x;
    y = gridSnapped.y;

    // Then apply vertex snap if enabled
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

    setSnapPosition(new THREE.Vector3(x, y, 0));
  });
}

function usePointerEventListeners({
  renderer,
  cmd,
  handlePointerDown,
}: {
  renderer: THREE.WebGLRenderer;
  cmd: Cmd | null;
  handlePointerDown: (e: PointerEvent) => void;
}) {
  useEffect(() => {
    const el = renderer.domElement;
    if (cmd?.type !== "DRAW_POLYLINE") {
      return;
    }

    el.addEventListener("pointerdown", handlePointerDown);

    return () => {
      el.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [renderer, cmd, handlePointerDown]);
}
