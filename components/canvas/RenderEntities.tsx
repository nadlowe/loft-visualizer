"use client";
import { colors } from "@/components/colors";
import { workPlaneToPlane3 } from "@/lib/conversion/threeToGeom";
import { handleNew } from "@/lib/entity/handleTools/handleNew";
import { handleToHash } from "@/lib/entity/handleTools/handleTools";
import { LoftId, PolylineId, WorkPlaneId } from "@/lib/util/uid";
import { useStore } from "@/store/useStore";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { shallow } from "zustand/shallow";
import {
  loftTableToRendered,
  RenderedLoft,
  updateLoftGeometry,
  updateLoftGeometryDuringDrag,
  updateSeamGeometry,
} from "./render/renderLoft";
import {
  polylineTableToRendered,
  polylineToLine2,
  RenderedPolyline,
  updatePolylineGeometry,
} from "./render/renderPolyline";
import { WorkPlane, workPlaneTableToRendered } from "./render/renderWorkPlane";
import { WorkPlaneWidget } from "./WorkPlaneWidget";

function SeamLine({ geometry }: { geometry: LineGeometry }) {
  const { size } = useThree();
  const lineRef = useRef<Line2>(null);

  const line = useMemo(() => {
    const material = new LineMaterial({
      color: colors.canvas.white,
      linewidth: 1.5,
      resolution: new THREE.Vector2(size.width, size.height),
      dashed: true,
      dashSize: 8,
      gapSize: 4,
    });
    const l = new Line2(geometry, material);
    l.computeLineDistances();
    return l;
  }, [geometry, size.width, size.height]);

  // Update dash size for screen-space scaling
  useFrame(({ camera, size: frameSize }) => {
    if (!lineRef.current) return;

    let worldUnitsPerPixel: number;
    if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
      const orthoCamera = camera as THREE.OrthographicCamera;
      const visibleWidth =
        (orthoCamera.right - orthoCamera.left) / orthoCamera.zoom;
      worldUnitsPerPixel = visibleWidth / frameSize.width;
    } else {
      const distance = camera.position.length();
      const fov = (camera as THREE.PerspectiveCamera).fov || 75;
      const vFov = (fov * Math.PI) / 180;
      const visibleHeight = 2 * Math.tan(vFov / 2) * distance;
      worldUnitsPerPixel = visibleHeight / frameSize.height;
    }

    const material = lineRef.current.material as LineMaterial;
    material.dashSize = 8 * worldUnitsPerPixel;
    material.gapSize = 4 * worldUnitsPerPixel;
    lineRef.current.computeLineDistances();
  });

  return <primitive ref={lineRef} object={line} />;
}

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
  const { camera } = useThree();

  const [isDragging, setIsDragging] = useState(false);
  const workPlaneRefs = useRef<Map<string, THREE.Group>>(new Map());
  const [lineGeometries] = useState(() => new Map<string, LineGeometry>());
  const [loftGeometries] = useState(
    () => new Map<string, THREE.BufferGeometry>()
  );
  const [loftSurfaceGeometries] = useState(
    () => new Map<string, THREE.BufferGeometry>()
  );
  const [loftWireframeGeometries] = useState(
    () => new Map<string, THREE.BufferGeometry>()
  );
  const [loftSeamGeometries] = useState(() => new Map<string, LineGeometry>());
  const selectedHandles = useStore((state) => state.selectedHandles);
  const initialPositionsRef = useRef<Map<string, THREE.Vector3>>(new Map());
  const dragSourceIdRef = useRef<string | null>(null);
  const [widgetGroupMap] = useState(() => new Map<string, THREE.Group>());

  // ─────────────────────────────────────────────────────────────────
  // Geometry Memoization
  // ─────────────────────────────────────────────────────────────────
  const { renderedWorkPlanes, renderedPolylines, renderedLofts } =
    useMemo(() => {
      // Access renderKey to ensure it's considered a used dependency
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      renderKey;

      const workPlanesArray = workPlaneTableToRendered(workPlanes);
      const polylinesArray = polylineTableToRendered(polylines);
      const loftsArray = loftTableToRendered(doc);

      polylinesArray.forEach((p: RenderedPolyline) => {
        updatePolylineGeometry(p, lineGeometries);
      });

      loftsArray.forEach((l: RenderedLoft) => {
        updateLoftGeometry(
          l,
          loftGeometries,
          loftSurfaceGeometries,
          loftWireframeGeometries
        );
        updateSeamGeometry(l, loftSeamGeometries);
      });

      return {
        renderedWorkPlanes: workPlanesArray,
        renderedPolylines: polylinesArray,
        renderedLofts: loftsArray,
      };
    }, [
      doc,
      renderKey,
      workPlanes,
      polylines,
      lineGeometries,
      loftGeometries,
      loftSurfaceGeometries,
      loftWireframeGeometries,
      loftSeamGeometries,
    ]);

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
          const geometry = lineGeometries.get(polyline.id);
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
                const geometry = lineGeometries.get(polyline.id);
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
                  const widgetGroup = widgetGroupMap.get(wpId);
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
            const { doc: currentDoc } = useStore.getState();
            const selectedIds = getSelectedWorkPlaneIds();
            for (const [loftId, loftEntity] of Object.entries(
              currentDoc.lofts
            )) {
              const polyline1 = currentDoc.polylines[loftEntity.polyline1];
              const polyline2 = currentDoc.polylines[loftEntity.polyline2];
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
                  loftGeometries,
                  loftSurfaceGeometries,
                  loftWireframeGeometries,
                  loftSeamGeometries
                );
              }
            }
          };

          const handleWorkPlaneChangeFinal = (updatedWorkPlane: WorkPlane) => {
            const { doc: finalDoc, setDoc } = useStore.getState();

            // Always save the full plane3 for the drag source (handles both rotation and translation)
            const plane3 = workPlaneToPlane3(updatedWorkPlane);

            // Calculate final delta for multi-select translation
            const initialPos = initialPositionsRef.current.get(id);
            if (!initialPos) {
              // Single update fallback (rotation or single selection)
              const entity = finalDoc.workPlanes[workPlaneId];
              if (!entity) return;
              setDoc({
                ...finalDoc,
                workPlanes: {
                  ...finalDoc.workPlanes,
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
            const updatedWorkPlanesMap = { ...finalDoc.workPlanes };

            for (const wpId of selectedIds) {
              const entity = finalDoc.workPlanes[wpId];
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
              ...finalDoc,
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
              key={`widget-${id}-${camera.uuid}-${renderKey}`}
              workPlane={workPlane as WorkPlane}
              workPlaneId={id}
              widgetRefs={widgetGroupMap}
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
        .filter((l: RenderedLoft) => !lofts[l.id as LoftId]?.hidden)
        .map((loft: RenderedLoft) => {
          const handle = handleNew("LOFT", loft.id as LoftId);
          const geometry = loftGeometries.get(loft.id);
          const surfaceGeometry = loftSurfaceGeometries.get(loft.id);
          const wireframeGeometry = loftWireframeGeometries.get(loft.id);
          const seamGeometry = loftSeamGeometries.get(loft.id);
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
              {seamGeometry && <SeamLine geometry={seamGeometry} />}
            </group>
          );
        })}
    </>
  );
}
