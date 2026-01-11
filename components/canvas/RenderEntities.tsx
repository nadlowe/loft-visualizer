"use client";
import { colors } from "@/components/colors";
import {
  loftTableToRendered,
  RenderedLoft,
  updateLoftGeometry,
  updateLoftGeometryDuringDrag,
} from "@/lib/canvas/render/renderLoft";
import {
  polylineTableToRendered,
  polylineToLine2,
  RenderedPolyline,
  updatePolylineGeometry,
} from "@/lib/canvas/render/renderPolyline";
import {
  WorkPlane,
  workPlaneTableToRendered,
} from "@/lib/canvas/render/renderWorkPlane";
import { workPlaneToPlane3 } from "@/lib/conversion/threeToGeom";
import { handleNew } from "@/lib/entity/handleTools/handleNew";
import { handleToHash } from "@/lib/entity/handleTools/handleTools";
import { useStore } from "@/lib/state/useStore";
import { LoftId, PolylineId, WorkPlaneId } from "@/lib/util/uid";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { shallow } from "zustand/shallow";
import { WorkPlaneWidget } from "./WorkPlaneWidget";

export function RenderEntities({
  onDraggingChange,
}: {
  onDraggingChange: (isDragging: boolean) => void;
}) {
  const { size } = useThree();
  const doc = useStore((state) => state.doc, shallow);
  const renderKey = useStore((state) => state.renderKey);
  const { workPlanes, polylines, lofts } = doc;
  const isSelected = useStore((state) => state.isSelected);
  const updateEntity = useStore((state) => state.updateEntity);

  const [isDragging, setIsDragging] = useState(false);
  const workPlaneRefs = useRef<Map<string, THREE.Group>>(new Map());
  const lineRefs = useRef<Map<string, LineGeometry>>(new Map());
  const loftRefs = useRef<Map<string, THREE.BufferGeometry>>(new Map());
  const loftSurfaceRefs = useRef<Map<string, THREE.BufferGeometry>>(new Map());
  const loftWireframeRefs = useRef<Map<string, THREE.BufferGeometry>>(
    new Map()
  );
  const selectedHandles = useStore((state) => state.selectedHandles);
  const initialPositionsRef = useRef<Map<string, THREE.Vector3>>(new Map());
  const dragSourceIdRef = useRef<string | null>(null);
  const widgetGroupRefs = useRef<Map<string, THREE.Group>>(new Map());

  // ─────────────────────────────────────────────────────────────────
  // Geometry Memoization
  // ─────────────────────────────────────────────────────────────────
  const { renderedWorkPlanes, renderedPolylines, renderedLofts } =
    useMemo(() => {
      const workPlanesArray = workPlaneTableToRendered(workPlanes);
      const polylinesArray = polylineTableToRendered(polylines);
      const loftsArray = loftTableToRendered(doc);

      polylinesArray.forEach((p: RenderedPolyline) => {
        updatePolylineGeometry(p, lineRefs.current);
      });

      loftsArray.forEach((l: RenderedLoft) => {
        updateLoftGeometry(
          l,
          loftRefs.current,
          loftSurfaceRefs.current,
          loftWireframeRefs.current
        );
      });

      return {
        renderedWorkPlanes: workPlanesArray,
        renderedPolylines: polylinesArray,
        renderedLofts: loftsArray,
      };
    }, [workPlanes, polylines, lofts, doc, renderKey]);

  useEffect(() => {
    if (!isDragging) {
      renderedWorkPlanes.forEach(({ workPlane, id }) => {
        workPlaneRefs.current.set(id, workPlane);
      });
    }
  }, [renderedWorkPlanes, isDragging]);

  useEffect(() => {
    onDraggingChange(isDragging);
  }, [isDragging, onDraggingChange]);

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Render polylines without work planes */}
      {renderedPolylines
        .filter(
          (p: RenderedPolyline) =>
            !p.workPlaneId && !polylines[p.id as PolylineId]?.hidden
        )
        .map((polyline: RenderedPolyline) => {
          const handle = handleNew("POLYLINE", polyline.id as PolylineId);
          const geometry = lineRefs.current.get(polyline.id);
          if (!geometry) return null;
          const line = polylineToLine2(
            geometry,
            handle,
            size,
            isSelected,
            polyline.vertices
          );
          return <primitive key={polyline.id} object={line} />;
        })}

      {/* Render polylines attached to work planes */}
      {renderedWorkPlanes
        .filter(({ id }) => !workPlanes[id as WorkPlaneId]?.hidden)
        .map(({ workPlane, id }) => {
          const workPlanePolylines = renderedPolylines.filter(
            (p: RenderedPolyline) =>
              p.workPlaneId === id && !polylines[p.id as PolylineId]?.hidden
          );

          return (
            <primitive key={id} object={workPlane}>
              {workPlanePolylines.map((polyline: RenderedPolyline) => {
                const handle = handleNew("POLYLINE", polyline.id as PolylineId);
                const geometry = lineRefs.current.get(polyline.id);
                if (!geometry) return null;
                const line = polylineToLine2(
                  geometry,
                  handle,
                  size,
                  isSelected,
                  polyline.vertices
                );
                return <primitive key={polyline.id} object={line} />;
              })}
            </primitive>
          );
        })}

      {/* Render work plane widgets for selected work planes */}
      {renderedWorkPlanes
        .filter(({ id }) => !workPlanes[id as WorkPlaneId]?.hidden)
        .map(({ workPlane, id }) => {
          const handle = handleNew("WORKPLANE", id as WorkPlaneId);
          const selected = isSelected(handle);
          if (!selected) return null;
          const workPlaneId = id as WorkPlaneId;

          // Get all selected work plane IDs
          const getSelectedWorkPlaneIds = () => {
            const ids: WorkPlaneId[] = [];
            for (const h of selectedHandles) {
              if (h.type === "WORKPLANE") {
                ids.push(h.id as WorkPlaneId);
              }
            }
            return ids;
          };

          const handleWorkPlaneChange = (updatedWorkPlane: WorkPlane) => {
            const plane3 = workPlaneToPlane3(updatedWorkPlane);
            updateEntity(handleNew("WORKPLANE", workPlaneId), (entity) => ({
              ...entity,
              plane3,
            }));
          };

          const handleWorkPlaneChangeTemporary = (
            updatedWorkPlane: WorkPlane
          ) => {
            const currentWorkPlane = workPlaneRefs.current.get(id);
            if (!currentWorkPlane) return;

            // Always update rotation for the current work plane
            currentWorkPlane.rotation.copy(updatedWorkPlane.rotation);

            // Calculate delta from initial position
            const initialPos = initialPositionsRef.current.get(id);
            if (!initialPos || dragSourceIdRef.current !== id) {
              // Not the drag source, skip (will be updated via delta)
              currentWorkPlane.position.copy(updatedWorkPlane.position);
              currentWorkPlane.updateMatrixWorld(true);
            } else {
              // This is the drag source - calculate and apply delta to all selected
              const delta = new THREE.Vector3().subVectors(
                updatedWorkPlane.position,
                initialPos
              );

              // Apply delta to all selected work planes (both refs and widget groups)
              const selectedIds = getSelectedWorkPlaneIds();
              for (const wpId of selectedIds) {
                const wpInitialPos = initialPositionsRef.current.get(wpId);
                if (!wpInitialPos) continue;

                const newPos = wpInitialPos.clone().add(delta);

                // Update workPlaneRefs (for polyline rendering)
                const wpRef = workPlaneRefs.current.get(wpId);
                if (wpRef) {
                  wpRef.position.copy(newPos);
                  wpRef.updateMatrixWorld(true);
                }

                // Update widget groups (for visual widgets) - skip the drag source
                if (wpId !== id) {
                  const widgetGroup = widgetGroupRefs.current.get(wpId);
                  if (widgetGroup) {
                    widgetGroup.position.copy(newPos);
                  }
                }
              }

              // Update the drag source position too
              currentWorkPlane.position.copy(updatedWorkPlane.position);
              currentWorkPlane.updateMatrixWorld(true);
            }

            // Update loft geometry for affected lofts
            const { doc } = useStore.getState();
            const selectedIds = getSelectedWorkPlaneIds();
            for (const [loftId, loftEntity] of Object.entries(doc.lofts)) {
              const polyline1 = doc.polylines[loftEntity.polyline1];
              const polyline2 = doc.polylines[loftEntity.polyline2];
              if (!polyline1 || !polyline2) continue;

              const wp1Affected =
                polyline1.workPlaneId &&
                selectedIds.includes(polyline1.workPlaneId);
              const wp2Affected =
                polyline2.workPlaneId &&
                selectedIds.includes(polyline2.workPlaneId);

              if (wp1Affected || wp2Affected) {
                updateLoftGeometryDuringDrag(
                  loftId as LoftId,
                  workPlaneId,
                  currentWorkPlane,
                  workPlaneRefs.current,
                  loftRefs.current,
                  loftSurfaceRefs.current,
                  loftWireframeRefs.current
                );
              }
            }
          };

          const handleWorkPlaneChangeFinal = (updatedWorkPlane: WorkPlane) => {
            const { doc, setDoc } = useStore.getState();

            // Always save the full plane3 for the drag source (handles both rotation and translation)
            const plane3 = workPlaneToPlane3(updatedWorkPlane);

            // Calculate final delta for multi-select translation
            const initialPos = initialPositionsRef.current.get(id);
            if (!initialPos) {
              // Single update fallback (rotation or single selection)
              const entity = doc.workPlanes[workPlaneId];
              if (!entity) return;
              setDoc({
                ...doc,
                workPlanes: {
                  ...doc.workPlanes,
                  [workPlaneId]: { ...entity, plane3 },
                },
              });
              return;
            }

            const delta = new THREE.Vector3().subVectors(
              updatedWorkPlane.position,
              initialPos
            );

            // Update all selected work planes
            const selectedIds = getSelectedWorkPlaneIds();
            const updatedWorkPlanesMap = { ...doc.workPlanes };

            for (const wpId of selectedIds) {
              const entity = doc.workPlanes[wpId];
              const wpInitialPos = initialPositionsRef.current.get(wpId);
              if (entity && wpInitialPos) {
                if (wpId === workPlaneId) {
                  // For the drag source, use the full plane3 (includes rotation)
                  updatedWorkPlanesMap[wpId] = {
                    ...entity,
                    plane3,
                  };
                } else {
                  // For other selected, apply translation delta
                  const newPosition = wpInitialPos.clone().add(delta);
                  updatedWorkPlanesMap[wpId] = {
                    ...entity,
                    plane3: {
                      ...entity.plane3,
                      origin: [newPosition.x, newPosition.y, newPosition.z],
                    },
                  };
                }
              }
            }

            setDoc({
              ...doc,
              workPlanes: updatedWorkPlanesMap,
            });

            // Clear refs
            initialPositionsRef.current.clear();
            dragSourceIdRef.current = null;
          };

          const handleDragStart = () => {
            const { saveSnapshot } = useStore.getState();
            saveSnapshot();

            // Store initial positions of all selected work planes
            dragSourceIdRef.current = id;
            initialPositionsRef.current.clear();
            const selectedIds = getSelectedWorkPlaneIds();
            for (const wpId of selectedIds) {
              const wpRef = workPlaneRefs.current.get(wpId);
              if (wpRef) {
                initialPositionsRef.current.set(wpId, wpRef.position.clone());
              }
            }
          };

          return (
            <WorkPlaneWidget
              key={`widget-${id}`}
              workPlane={workPlane as WorkPlane}
              workPlaneId={id}
              widgetRefs={widgetGroupRefs.current}
              onWorkPlaneChange={handleWorkPlaneChange}
              onWorkPlaneChangeTemporary={handleWorkPlaneChangeTemporary}
              onWorkPlaneChangeFinal={handleWorkPlaneChangeFinal}
              onDraggingChange={setIsDragging}
              onDragStart={handleDragStart}
              enabled={true}
              showTranslate={true}
              showRotate={true}
              showHelpers={true}
            />
          );
        })}

      {/* Render lofts */}
      {renderedLofts
        .filter((l: RenderedLoft) => !lofts[l.id as any]?.hidden)
        .map((loft: RenderedLoft) => {
          const handle = handleNew("LOFT", loft.id as any);
          const geometry = loftRefs.current.get(loft.id);
          const surfaceGeometry = loftSurfaceRefs.current.get(loft.id);
          const wireframeGeometry = loftWireframeRefs.current.get(loft.id);
          if (!geometry) return null;
          const selected = isSelected(handle);
          const color = selected
            ? colors.canvas.selected
            : colors.canvas.unselected;
          const pathPoints = loft.sections.flat();
          return (
            <group key={loft.id}>
              {surfaceGeometry && (
                <mesh geometry={surfaceGeometry}>
                  <meshStandardMaterial
                    color={color}
                    transparent
                    opacity={0.8}
                    side={THREE.DoubleSide}
                    depthWrite={true}
                    roughness={1}
                    metalness={0}
                  />
                </mesh>
              )}
              {wireframeGeometry && (
                <lineSegments geometry={wireframeGeometry}>
                  <lineBasicMaterial color={color} transparent opacity={0.75} />
                </lineSegments>
              )}
              <lineSegments
                geometry={geometry}
                userData={{ handleHash: handleToHash(handle), pathPoints }}
              >
                <lineBasicMaterial color={color} transparent opacity={0.75} />
              </lineSegments>
            </group>
          );
        })}
    </>
  );
}
