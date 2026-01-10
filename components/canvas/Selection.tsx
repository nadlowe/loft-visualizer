"use client";

import {
  DRAG_THRESHOLD,
  findClosestPolyline,
  findPolylinesInRect,
  getSelectableLines,
  GROUND_PLANE,
  screenToPointer,
  screenToWorld,
} from "@/lib/canvas/selectionUtils";
import { hashToHandle, SelectableHandle } from "@/lib/entity/handleTypes";
import { usePolylineDrag } from "@/lib/hooks/usePolylineDrag";
import { useStore } from "@/lib/state/useStore";
import { PolylineId } from "@/lib/util/uid";
import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { SelectionWindowOverlay } from "./SelectionWindowOverlay";

interface SelectionProps {
  is2D: boolean;
  onDraggingChange?: (isDragging: boolean) => void;
}

export function Selection({ is2D, onDraggingChange }: SelectionProps) {
  const { raycaster, pointer, camera, gl: renderer, scene } = useThree();
  const {
    selectOnly,
    toggleSelection,
    selectMultiple,
    clearSelection,
    selectedHandles,
    cmd,
    setEditingPolylineId,
    editingPolylineId,
  } = useStore();

  const isPanningRef = useRef(false);
  const spaceKeyPressedRef = handleSpaceKeyPressedFunc(renderer.domElement);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const lastClickHandleRef = useRef<SelectableHandle | null>(null);
  const [selectionRect, setSelectionRect] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
    canvasRect: DOMRect;
  } | null>(null);

  // Clear selection rect when entering vertex editing mode
  useEffect(() => {
    if (editingPolylineId) {
      setSelectionRect(null);
    }
  }, [editingPolylineId]);

  const {
    draggingPolylineId,
    hasPendingDrag,
    tryStartPendingDrag,
    checkStartDrag,
    handleDragMove,
    endDrag,
    clearPendingDrag,
  } = usePolylineDrag({
    scene,
    camera,
    renderer,
    raycaster,
    pointer,
    is2D,
    onDraggingChange,
  });

  useMouseEventListeners({
    renderer,
    cmd,
    handleMouseDown: handleMouseDownFunc({
      renderer,
      cmd,
      editingPolylineId,
      spaceKeyPressedRef,
      isPanningRef,
      mouseDownPosRef,
      setSelectionRect,
      tryStartPendingDrag,
      is2D,
    }),
    handleMouseMove: handleMouseMoveFunc({
      isPanningRef,
      editingPolylineId,
      mouseDownPosRef,
      hasPendingDrag,
      checkStartDrag,
      handleDragMove,
      is2D,
      selectionRect,
      setSelectionRect,
      renderer,
    }),
    handleMouseUp: handleMouseUpFunc({
      draggingPolylineId,
      endDrag,
      mouseDownPosRef,
      clearPendingDrag,
      renderer,
      cmd,
      editingPolylineId,
      isPanningRef,
      resetSelectionState: useCallback(() => {
        setSelectionRect(null);
        mouseDownPosRef.current = null;
      }, []),
      is2D,
      selectionRect,
      camera,
      handleWindowSelection: handleWindowSelectionFunc(
        scene,
        selectMultiple,
        selectedHandles,
        clearSelection
      ),
      pointer,
      raycaster,
      handleClickSelection: handleClickSelectionFunc({
        scene,
        is2D,
        camera,
        lastClickTimeRef,
        lastClickHandleRef,
        clearSelection,
        setEditingPolylineId,
        toggleSelection,
        selectOnly,
      }),
    }),
  });

  useSelectionOverlay({
    editingPolylineId,
    isPanningRef,
    setSelectionRect,
    renderer,
    selectionRect,
  });

  return null;
}

function handleWindowSelectionFunc(
  scene: THREE.Scene<THREE.Object3DEventMap>,
  selectMultiple: (handles: SelectableHandle[]) => void,
  selectedHandles: Set<SelectableHandle>,
  clearSelection: () => void
) {
  return useCallback(
    (e: MouseEvent, startWorld: THREE.Vector3, endWorld: THREE.Vector3) => {
      const rectMin = new THREE.Vector3(
        Math.min(startWorld.x, endWorld.x),
        Math.min(startWorld.y, endWorld.y),
        0
      );
      const rectMax = new THREE.Vector3(
        Math.max(startWorld.x, endWorld.x),
        Math.max(startWorld.y, endWorld.y),
        0
      );

      const lines = getSelectableLines(scene);
      const selectedLines = findPolylinesInRect(rectMin, rectMax, lines);

      if (selectedLines.length > 0) {
        const handles = selectedLines
          .map((line) => hashToHandle(line.userData.handleHash as string))
          .filter((handle): handle is SelectableHandle => handle !== undefined);

        if (e.shiftKey) {
          selectMultiple([...selectedHandles, ...handles]);
        } else {
          selectMultiple(handles);
        }
      } else if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
        clearSelection();
      }
    },
    [scene, selectedHandles, selectMultiple, clearSelection]
  );
}

function handleSpaceKeyPressedFunc(domElement: HTMLCanvasElement) {
  const spaceKeyPressedRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === domElement) {
        spaceKeyPressedRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceKeyPressedRef.current = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [domElement]);

  return spaceKeyPressedRef;
}

function handleMouseMoveFunc({
  isPanningRef,
  editingPolylineId,
  mouseDownPosRef,
  hasPendingDrag,
  checkStartDrag,
  handleDragMove,
  is2D,
  selectionRect,
  setSelectionRect,
  renderer,
}: {
  isPanningRef: React.RefObject<boolean>;
  editingPolylineId: PolylineId | null;
  mouseDownPosRef: React.RefObject<{ x: number; y: number } | null>;
  hasPendingDrag: () => boolean;
  checkStartDrag: (
    clientX: number,
    clientY: number,
    mouseDownPos: { x: number; y: number }
  ) => boolean;
  handleDragMove: (clientX: number, clientY: number) => boolean;
  is2D: boolean;
  selectionRect: {
    start: { x: number; y: number };
    current: { x: number; y: number };
    canvasRect: DOMRect;
  } | null;
  setSelectionRect: React.Dispatch<
    React.SetStateAction<{
      start: { x: number; y: number };
      current: { x: number; y: number };
      canvasRect: DOMRect;
    } | null>
  >;
  renderer: THREE.WebGLRenderer;
}) {
  return useCallback(
    (e: MouseEvent) => {
      if (isPanningRef.current || editingPolylineId) return;

      // Check if pending drag should start
      if (
        mouseDownPosRef.current &&
        hasPendingDrag() &&
        checkStartDrag(e.clientX, e.clientY, mouseDownPosRef.current)
      ) {
        return;
      }

      // Handle active drag
      if (handleDragMove(e.clientX, e.clientY)) {
        return;
      }

      // Update selection rectangle
      if (mouseDownPosRef.current && is2D && selectionRect) {
        setSelectionRect({
          ...selectionRect,
          current: { x: e.clientX, y: e.clientY },
          canvasRect: renderer.domElement.getBoundingClientRect(),
        });
      }
    },
    [
      isPanningRef,
      editingPolylineId,
      mouseDownPosRef,
      hasPendingDrag,
      checkStartDrag,
      handleDragMove,
      is2D,
      selectionRect,
      setSelectionRect,
      renderer,
    ]
  );
}

function handleClickSelectionFunc({
  scene,
  is2D,
  camera,
  lastClickTimeRef,
  lastClickHandleRef,
  clearSelection,
  setEditingPolylineId,
  toggleSelection,
  selectOnly,
}: {
  scene: THREE.Scene;
  is2D: boolean;
  camera: THREE.Camera;
  lastClickTimeRef: React.RefObject<number>;
  lastClickHandleRef: React.RefObject<SelectableHandle | null>;
  clearSelection: () => void;
  setEditingPolylineId: (id: PolylineId | null) => void;
  toggleSelection: (handle: SelectableHandle) => void;
  selectOnly: (handle: SelectableHandle) => void;
}) {
  return useCallback(
    (e: MouseEvent, intersection: THREE.Vector3) => {
      const lines = getSelectableLines(scene);
      const closest = findClosestPolyline(intersection, lines, is2D, camera);

      if (closest) {
        e.preventDefault();
        e.stopPropagation();
        const handle = hashToHandle(closest.line.userData.handleHash as string);
        if (!handle) return;

        // Check for double-click (only for polylines)
        const currentTime = Date.now();
        const timeSinceLastClick = currentTime - lastClickTimeRef.current;
        const lastHandle = lastClickHandleRef.current;
        const isDoubleClick =
          timeSinceLastClick < 300 &&
          lastHandle &&
          handle.type === "POLYLINE" &&
          lastHandle.type === "POLYLINE" &&
          handle.id === lastHandle.id;

        if (isDoubleClick) {
          clearSelection();
          setEditingPolylineId(handle.id as PolylineId);
          lastClickTimeRef.current = 0;
          lastClickHandleRef.current = null;
          return;
        }

        lastClickTimeRef.current = currentTime;
        lastClickHandleRef.current = handle;

        if (e.shiftKey) {
          toggleSelection(handle);
        } else {
          selectOnly(handle);
        }
      } else if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
        clearSelection();
      }
    },
    [
      scene,
      is2D,
      camera,
      lastClickTimeRef,
      lastClickHandleRef,
      clearSelection,
      setEditingPolylineId,
      toggleSelection,
      selectOnly,
    ]
  );
}

function handleMouseDownFunc({
  renderer,
  cmd,
  editingPolylineId,
  spaceKeyPressedRef,
  isPanningRef,
  mouseDownPosRef,
  setSelectionRect,
  tryStartPendingDrag,
  is2D,
}: {
  renderer: THREE.WebGLRenderer;
  cmd: { type: string } | null;
  editingPolylineId: PolylineId | null;
  spaceKeyPressedRef: React.RefObject<boolean>;
  isPanningRef: React.RefObject<boolean>;
  mouseDownPosRef: React.RefObject<{ x: number; y: number } | null>;
  setSelectionRect: React.Dispatch<
    React.SetStateAction<{
      start: { x: number; y: number };
      current: { x: number; y: number };
      canvasRect: DOMRect;
    } | null>
  >;
  tryStartPendingDrag: (clientX: number, clientY: number) => boolean;
  is2D: boolean;
}) {
  return useCallback(
    (e: MouseEvent) => {
      if (
        e.target !== renderer.domElement ||
        cmd?.type === "DRAW_POLYLINE" ||
        editingPolylineId
      )
        return;

      // Check for panning (middle/right mouse button or space+left click)
      if (
        e.button === 1 ||
        e.button === 2 ||
        (e.button === 0 && spaceKeyPressedRef.current)
      ) {
        isPanningRef.current = true;
        setSelectionRect(null);
        return;
      }

      mouseDownPosRef.current = { x: e.clientX, y: e.clientY };

      // Try to set up polyline drag if clicking on selected polyline
      if (e.button === 0 && tryStartPendingDrag(e.clientX, e.clientY)) {
        return;
      }

      // Start window selection in 2D mode
      if (is2D && e.button === 0) {
        setSelectionRect({
          start: { x: e.clientX, y: e.clientY },
          current: { x: e.clientX, y: e.clientY },
          canvasRect: renderer.domElement.getBoundingClientRect(),
        });
      }
    },
    [
      renderer,
      cmd,
      editingPolylineId,
      spaceKeyPressedRef,
      isPanningRef,
      mouseDownPosRef,
      setSelectionRect,
      tryStartPendingDrag,
      is2D,
    ]
  );
}

function handleMouseUpFunc({
  draggingPolylineId,
  endDrag,
  mouseDownPosRef,
  clearPendingDrag,
  renderer,
  cmd,
  editingPolylineId,
  isPanningRef,
  resetSelectionState,
  is2D,
  selectionRect,
  camera,
  handleWindowSelection,
  pointer,
  raycaster,
  handleClickSelection,
}: {
  draggingPolylineId: PolylineId | null;
  endDrag: () => void;
  mouseDownPosRef: React.RefObject<{ x: number; y: number } | null>;
  clearPendingDrag: () => void;
  renderer: THREE.WebGLRenderer;
  cmd: { type: string } | null;
  editingPolylineId: PolylineId | null;
  isPanningRef: React.RefObject<boolean>;
  resetSelectionState: () => void;
  is2D: boolean;
  selectionRect: {
    start: { x: number; y: number };
    current: { x: number; y: number };
    canvasRect: DOMRect;
  } | null;
  camera: THREE.Camera;
  handleWindowSelection: (
    e: MouseEvent,
    startWorld: THREE.Vector3,
    endWorld: THREE.Vector3
  ) => void;
  pointer: THREE.Vector2;
  raycaster: THREE.Raycaster;
  handleClickSelection: (e: MouseEvent, intersection: THREE.Vector3) => void;
}) {
  return useCallback(
    (e: MouseEvent) => {
      // End polyline dragging
      if (draggingPolylineId) {
        endDrag();
        mouseDownPosRef.current = null;
        return;
      }

      // Clear pending drag (allows click/double-click to proceed)
      clearPendingDrag();

      if (
        e.target !== renderer.domElement ||
        !mouseDownPosRef.current ||
        cmd?.type === "DRAW_POLYLINE" ||
        editingPolylineId
      ) {
        isPanningRef.current = false;
        resetSelectionState();
        return;
      }

      if (isPanningRef.current) {
        isPanningRef.current = false;
        resetSelectionState();
        return;
      }

      const dx = Math.abs(e.clientX - mouseDownPosRef.current.x);
      const dy = Math.abs(e.clientY - mouseDownPosRef.current.y);
      const moved = dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD;

      // Handle window selection
      if (is2D && selectionRect && moved) {
        const rect = renderer.domElement.getBoundingClientRect();
        const startWorld = screenToWorld(
          selectionRect.start.x,
          selectionRect.start.y,
          rect,
          camera
        );
        const endWorld = screenToWorld(
          selectionRect.current.x,
          selectionRect.current.y,
          rect,
          camera
        );

        if (startWorld && endWorld) {
          handleWindowSelection(e, startWorld, endWorld);
        }
        resetSelectionState();
        return;
      }

      if (moved) {
        resetSelectionState();
        return;
      }

      // Handle click selection
      const rect = renderer.domElement.getBoundingClientRect();
      const pointerCoords = screenToPointer(e.clientX, e.clientY, rect);
      pointer.x = pointerCoords.x;
      pointer.y = pointerCoords.y;
      raycaster.setFromCamera(pointer, camera);

      const intersection = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(GROUND_PLANE, intersection)) {
        resetSelectionState();
        return;
      }

      handleClickSelection(e, intersection);
      resetSelectionState();
    },
    [
      draggingPolylineId,
      endDrag,
      mouseDownPosRef,
      clearPendingDrag,
      renderer,
      cmd,
      editingPolylineId,
      isPanningRef,
      resetSelectionState,
      is2D,
      selectionRect,
      camera,
      handleWindowSelection,
      pointer,
      raycaster,
      handleClickSelection,
    ]
  );
}

function useMouseEventListeners({
  renderer,
  cmd,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
}: {
  renderer: THREE.WebGLRenderer;
  cmd: { type: string } | null;
  handleMouseDown: (e: MouseEvent) => void;
  handleMouseMove: (e: MouseEvent) => void;
  handleMouseUp: (e: MouseEvent) => void;
}) {
  useEffect(() => {
    if (cmd?.type === "DRAW_POLYLINE") return;

    renderer.domElement.addEventListener("mousedown", handleMouseDown);
    renderer.domElement.addEventListener("mousemove", handleMouseMove);
    renderer.domElement.addEventListener("mouseup", handleMouseUp);

    return () => {
      renderer.domElement.removeEventListener("mousedown", handleMouseDown);
      renderer.domElement.removeEventListener("mousemove", handleMouseMove);
      renderer.domElement.removeEventListener("mouseup", handleMouseUp);
    };
  }, [renderer, cmd, handleMouseDown, handleMouseMove, handleMouseUp]);
}

function useSelectionOverlay({
  editingPolylineId,
  isPanningRef,
  setSelectionRect,
  renderer,
  selectionRect,
}: {
  editingPolylineId: string | null;
  isPanningRef: React.MutableRefObject<boolean>;
  setSelectionRect: React.Dispatch<
    React.SetStateAction<{
      start: { x: number; y: number };
      current: { x: number; y: number };
      canvasRect: DOMRect;
    } | null>
  >;
  renderer: THREE.WebGLRenderer;
  selectionRect: {
    start: { x: number; y: number };
    current: { x: number; y: number };
    canvasRect: DOMRect;
  } | null;
}) {
  useEffect(() => {
    if (editingPolylineId || isPanningRef.current) {
      setSelectionRect(null);
      return;
    }

    const containerElement = renderer.domElement.parentElement;
    if (!containerElement || !selectionRect) return;

    const overlayContainer = document.createElement("div");
    Object.assign(overlayContainer.style, {
      position: "absolute",
      pointerEvents: "none",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      zIndex: "10",
    });
    containerElement.appendChild(overlayContainer);

    const root = createRoot(overlayContainer);
    root.render(
      <SelectionWindowOverlay
        start={selectionRect.start}
        current={selectionRect.current}
        canvasRect={selectionRect.canvasRect}
      />
    );

    return () => {
      root.unmount();
      overlayContainer.parentElement?.removeChild(overlayContainer);
    };
  }, [
    selectionRect,
    renderer,
    editingPolylineId,
    isPanningRef,
    setSelectionRect,
  ]);
}
