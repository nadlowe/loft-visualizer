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
import { PolylineId, WorkPlaneId } from "@/lib/util/uid";
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
  const { workPlanes, polylines, lofts } = useStore(
    (state) => ({
      workPlanes: state.doc.workPlanes,
      polylines: state.doc.polylines,
      lofts: state.doc.lofts,
    }),
    shallow
  );
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

  // ─────────────────────────────────────────────────────────────────
  // Geometry Memoization
  // ─────────────────────────────────────────────────────────────────
  const { renderedWorkPlanes, renderedPolylines, renderedLofts } =
    useMemo(() => {
      const workPlanesArray = workPlaneTableToRendered(workPlanes);
      const polylinesArray = polylineTableToRendered(polylines);
      const loftsArray = loftTableToRendered(workPlanesArray, polylines, lofts);

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
    }, [workPlanes, polylines, lofts]);

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
            if (currentWorkPlane) {
              currentWorkPlane.position.copy(updatedWorkPlane.position);
              currentWorkPlane.rotation.copy(updatedWorkPlane.rotation);
              currentWorkPlane.updateMatrixWorld(true);
            }

            const { doc } = useStore.getState();
            for (const [loftId, loftEntity] of Object.entries(doc.lofts)) {
              const polyline1 = doc.polylines[loftEntity.polyline1];
              const polyline2 = doc.polylines[loftEntity.polyline2];
              if (!polyline1 || !polyline2) continue;

              if (
                polyline1.workPlaneId === workPlaneId ||
                polyline2.workPlaneId === workPlaneId
              ) {
                updateLoftGeometryDuringDrag(
                  loftId,
                  loftEntity,
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
            const plane3 = workPlaneToPlane3(updatedWorkPlane);
            const { doc, setDoc } = useStore.getState();
            const entity = doc.workPlanes[workPlaneId];
            if (!entity) return;

            setDoc({
              ...doc,
              workPlanes: {
                ...doc.workPlanes,
                [workPlaneId]: {
                  ...entity,
                  plane3,
                },
              },
            });
          };

          const handleDragStart = () => {
            const { saveSnapshot } = useStore.getState();
            saveSnapshot();
          };

          return (
            <WorkPlaneWidget
              key={`widget-${id}`}
              workPlane={workPlane as WorkPlane}
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
