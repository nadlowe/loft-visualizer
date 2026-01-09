"use client";
import { colors } from "@/components/ui/colors";
import {
  loftTableToThree,
  polyline2ToWorldVertices,
  polylineTableToThree,
  WorkPlane,
  workPlanesTableToThree,
} from "@/lib/conversion/geomToThree";
import { workPlaneToPlane3 } from "@/lib/conversion/threeToGeom";
import { handleNew } from "@/lib/entity/handle";
import { EntityHandle, handleToHash } from "@/lib/entity/handleTypes";
import { useStore } from "@/lib/state/useStore";
import { PolylineId, WorkPlaneId } from "@/lib/util/uid";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
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
  const selectOnly = useStore((state) => state.selectOnly);
  const toggleSelection = useStore((state) => state.toggleSelection);
  const updateWorkPlane = useStore((state) => state.updateWorkPlane);

  const [isDragging, setIsDragging] = useState(false);
  const workPlaneRefs = useRef<Map<string, THREE.Group>>(new Map());
  const lineRefs = useRef<Map<string, LineGeometry>>(new Map());
  const loftRefs = useRef<Map<string, THREE.BufferGeometry>>(new Map());
  const loftSurfaceRefs = useRef<Map<string, THREE.BufferGeometry>>(new Map());

  const { renderedWorkPlanes, renderedPolylines, renderedLofts } =
    useMemo(() => {
      const workPlanesArray = workPlanesTableToThree(workPlanes);
      const polylinesArray = polylineTableToThree(polylines);
      const loftsArray = loftTableToThree(workPlanesArray, polylines, lofts);

      // Store line geometries in refs for smooth updates
      polylinesArray.forEach((p) => {
        const positions: number[] = [];
        p.vertices.forEach((v) => {
          positions.push(v.x, v.y, v.z);
        });

        const existingGeometry = lineRefs.current.get(p.id);
        // LineGeometry doesn't handle buffer resize well, so recreate if vertex count changed
        const existingVertexCount = existingGeometry
          ? (existingGeometry.attributes.instanceStart?.count ?? 0) + 1
          : 0;
        const newVertexCount = p.vertices.length;

        if (existingGeometry && existingVertexCount === newVertexCount) {
          // Same vertex count - can update in place
          existingGeometry.setPositions(positions);
        } else {
          // Vertex count changed or new geometry - recreate
          if (existingGeometry) {
            existingGeometry.dispose();
          }
          const geometry = new LineGeometry();
          geometry.setPositions(positions);
          lineRefs.current.set(p.id, geometry);
        }
      });

      loftsArray.forEach((l) => {
        const existingGeometry = loftRefs.current.get(l.id);
        if (existingGeometry) {
          // Update existing geometry positions and indices
          const positions: number[] = [];
          const indices: number[] = [];
          let vertexIndex = 0;

          l.rungs.forEach((rung) => {
            positions.push(rung[0].x, rung[0].y, rung[0].z);
            positions.push(rung[1].x, rung[1].y, rung[1].z);
            // Each rung is a line segment connecting the two vertices
            indices.push(vertexIndex, vertexIndex + 1);
            vertexIndex += 2;
          });

          existingGeometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(positions, 3)
          );
          existingGeometry.setIndex(indices);
          existingGeometry.attributes.position.needsUpdate = true;
        } else {
          // Create new geometry with indices
          const geometry = new THREE.BufferGeometry();
          const positions: number[] = [];
          const indices: number[] = [];
          let vertexIndex = 0;

          l.rungs.forEach((rung) => {
            positions.push(rung[0].x, rung[0].y, rung[0].z);
            positions.push(rung[1].x, rung[1].y, rung[1].z);
            // Each rung is a line segment connecting the two vertices
            indices.push(vertexIndex, vertexIndex + 1);
            vertexIndex += 2;
          });

          geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(positions, 3)
          );
          geometry.setIndex(indices);
          loftRefs.current.set(l.id, geometry);
        }

        // Create/update surface geometry (quads between consecutive rungs)
        if (l.rungs.length >= 2) {
          const surfacePositions: number[] = [];
          const surfaceIndices: number[] = [];
          let surfaceVertexIndex = 0;

          for (let i = 0; i < l.rungs.length - 1; i++) {
            const rung1 = l.rungs[i];
            const rung2 = l.rungs[i + 1];
            // Quad vertices: rung1[0], rung1[1], rung2[1], rung2[0]
            // v0 -- v3
            // |      |
            // v1 -- v2
            surfacePositions.push(
              rung1[0].x,
              rung1[0].y,
              rung1[0].z, // v0
              rung1[1].x,
              rung1[1].y,
              rung1[1].z, // v1
              rung2[1].x,
              rung2[1].y,
              rung2[1].z, // v2
              rung2[0].x,
              rung2[0].y,
              rung2[0].z // v3
            );
            // Two triangles: v0-v1-v2, v0-v2-v3
            surfaceIndices.push(
              surfaceVertexIndex,
              surfaceVertexIndex + 1,
              surfaceVertexIndex + 2,
              surfaceVertexIndex,
              surfaceVertexIndex + 2,
              surfaceVertexIndex + 3
            );
            surfaceVertexIndex += 4;
          }

          const existingSurfaceGeometry = loftSurfaceRefs.current.get(l.id);
          if (existingSurfaceGeometry) {
            existingSurfaceGeometry.setAttribute(
              "position",
              new THREE.Float32BufferAttribute(surfacePositions, 3)
            );
            existingSurfaceGeometry.setIndex(surfaceIndices);
            existingSurfaceGeometry.attributes.position.needsUpdate = true;
            existingSurfaceGeometry.computeVertexNormals();
          } else {
            const surfaceGeometry = new THREE.BufferGeometry();
            surfaceGeometry.setAttribute(
              "position",
              new THREE.Float32BufferAttribute(surfacePositions, 3)
            );
            surfaceGeometry.setIndex(surfaceIndices);
            surfaceGeometry.computeVertexNormals();
            loftSurfaceRefs.current.set(l.id, surfaceGeometry);
          }
        }
      });

      return {
        renderedWorkPlanes: workPlanesArray,
        renderedPolylines: polylinesArray,
        renderedLofts: loftsArray,
      };
    }, [workPlanes, polylines, lofts]);

  // Update refs when workPlanes change (but not during dragging)
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

  return (
    <>
      {/* Render work planes from doc */}
      {renderedWorkPlanes.map(({ workPlane, id }) => {
        const workPlaneId = id as WorkPlaneId;

        const workPlanePolylines = renderedPolylines.filter(
          (p) => p.workPlaneId === id
        );

        return (
          <primitive key={id} object={workPlane}>
            {workPlanePolylines.map((polyline) => {
              const handle = handleNew("POLYLINE", polyline.id as PolylineId);
              const geometry = lineRefs.current.get(polyline.id);
              if (!geometry) return null;
              const line = renderLine(
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
      {renderedWorkPlanes.map(({ workPlane, id }) => {
        const handle = handleNew("WORKPLANE", id as WorkPlaneId);
        const selected = isSelected(handle);
        if (!selected) return null;
        const workPlaneId = id as WorkPlaneId;

        const handleWorkPlaneChange = (updatedWorkPlane: WorkPlane) => {
          const plane3 = workPlaneToPlane3(updatedWorkPlane);
          updateWorkPlane(workPlaneId, (entity) => ({
            ...entity,
            plane3,
          }));
        };

        const handleWorkPlaneChangeTemporary = (
          updatedWorkPlane: WorkPlane
        ) => {
          // Update Three.js object directly (for smooth dragging)
          const currentWorkPlane = workPlaneRefs.current.get(id);
          if (currentWorkPlane) {
            currentWorkPlane.position.copy(updatedWorkPlane.position);
            currentWorkPlane.rotation.copy(updatedWorkPlane.rotation);
            currentWorkPlane.updateMatrixWorld(true);
          }

          // Update loft geometries that depend on polylines from this work plane
          const { doc } = useStore.getState();
          for (const [loftId, loftEntity] of Object.entries(doc.lofts)) {
            const polyline1 = doc.polylines[loftEntity.polyline1];
            const polyline2 = doc.polylines[loftEntity.polyline2];
            if (!polyline1 || !polyline2) continue;

            // Check if either polyline is on this work plane
            if (
              polyline1.workPlaneId === workPlaneId ||
              polyline2.workPlaneId === workPlaneId
            ) {
              updateLineGeometry(
                loftId,
                loftEntity,
                workPlaneId,
                currentWorkPlane,
                workPlaneRefs,
                loftRefs,
                loftSurfaceRefs
              );
            }
          }
        };

        const handleWorkPlaneChangeFinal = (updatedWorkPlane: WorkPlane) => {
          // Final update on mouse up - use setDoc to avoid saving another snapshot
          // (snapshot was already saved on drag start)
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
          // Save snapshot when drag starts so undo restores to pre-drag state
          const { saveSnapshot } = useStore.getState();
          saveSnapshot();
        };

        return (
          <WorkPlaneWidget
            key={`widget-${id}`}
            workPlane={workPlane as any}
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

      {/* Render polylines without work planes */}
      {renderedPolylines
        .filter((p) => !p.workPlaneId)
        .map((polyline) => {
          const handle = handleNew("POLYLINE", polyline.id as PolylineId);
          const geometry = lineRefs.current.get(polyline.id);
          if (!geometry) return null;
          const line = renderLine(
            geometry,
            handle,
            size,
            isSelected,
            polyline.vertices
          );
          return <primitive key={polyline.id} object={line} />;
        })}

      {/* Render lofts */}
      {renderedLofts.map((loft) => {
        const handle = handleNew("LOFT", loft.id as any);
        const geometry = loftRefs.current.get(loft.id);
        const surfaceGeometry = loftSurfaceRefs.current.get(loft.id);
        if (!geometry) return null;
        const selected = isSelected(handle);
        const color = selected ? colors.selection.highlight : 0x888888;
        // Flatten rungs for pathPoints (used for selection)
        const pathPoints = loft.rungs.flat();
        return (
          <group key={loft.id}>
            {/* Surface mesh with 20% opacity */}
            {surfaceGeometry && (
              <mesh geometry={surfaceGeometry}>
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.2}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            )}
            {/* Line segments (rungs) */}
            <lineSegments
              geometry={geometry}
              userData={{ handleHash: handleToHash(handle), pathPoints }}
            >
              <lineBasicMaterial color={color} />
            </lineSegments>
          </group>
        );
      })}
    </>
  );
}

// Unified function to render any line as a Line2 component
function renderLine(
  geometry: LineGeometry,
  handle: EntityHandle,
  size: { width: number; height: number },
  isSelected: (handle: ReturnType<typeof handleNew>) => boolean,
  pathPoints: THREE.Vector3[]
): Line2 {
  const selected = isSelected(handle);
  const color =
    handle.type === "LOFT"
      ? selected
        ? colors.selection.highlight
        : 0x888888
      : selected
        ? colors.selection.highlight
        : 0xffffff;

  const material = new LineMaterial({
    color,
    linewidth: 1.5,
    resolution: new THREE.Vector2(size.width, size.height),
  });

  const line = new Line2(geometry, material);
  line.userData.handleHash = handleToHash(handle);
  line.userData.pathPoints = pathPoints;
  return line;
}

// Helper function to update loft geometry during dragging
function updateLineGeometry(
  loftId: string,
  loftEntity: { polyline1: PolylineId; polyline2: PolylineId },
  workPlaneId: WorkPlaneId,
  currentWorkPlane: THREE.Group | undefined,
  workPlaneRefs: React.RefObject<Map<string, THREE.Group>>,
  loftRefs: React.RefObject<Map<string, THREE.BufferGeometry>>,
  loftSurfaceRefs: React.RefObject<Map<string, THREE.BufferGeometry>>
) {
  const { doc } = useStore.getState();
  const polyline1 = doc.polylines[loftEntity.polyline1 as PolylineId];
  const polyline2 = doc.polylines[loftEntity.polyline2 as PolylineId];
  if (!polyline1 || !polyline2) return;

  const loftGeometry = loftRefs.current.get(loftId);
  if (!loftGeometry) return;

  // Get work planes for transformation
  const wp1 =
    polyline1.workPlaneId === workPlaneId
      ? currentWorkPlane
      : workPlaneRefs.current.get(polyline1.workPlaneId || "");
  const wp2 =
    polyline2.workPlaneId === workPlaneId
      ? currentWorkPlane
      : workPlaneRefs.current.get(polyline2.workPlaneId || "");

  if (wp1) wp1.updateMatrixWorld(true);
  if (wp2) wp2.updateMatrixWorld(true);

  // Recompute vertices in world space
  const vertices1 = polyline2ToWorldVertices(
    polyline1.polyline,
    wp1 || undefined
  );
  const vertices2 = polyline2ToWorldVertices(
    polyline2.polyline,
    wp2 || undefined
  );

  // Combine vertices into loft segments (ladder rungs: array of arrays)
  const rungs: THREE.Vector3[][] = [];
  const maxCount = Math.max(vertices1.length, vertices2.length);
  const lastIdx1 = vertices1.length > 0 ? vertices1.length - 1 : 0;
  const lastIdx2 = vertices2.length > 0 ? vertices2.length - 1 : 0;

  for (let i = 0; i < maxCount; i++) {
    const idx1 = Math.min(i, lastIdx1);
    const idx2 = Math.min(i, lastIdx2);
    // Each rung connects corresponding vertices (or last vertex if one is shorter)
    rungs.push([vertices1[idx1], vertices2[idx2]]);
  }

  // Update line geometry positions and indices from rungs
  const positions: number[] = [];
  const indices: number[] = [];
  let vertexIndex = 0;

  rungs.forEach((rung) => {
    positions.push(rung[0].x, rung[0].y, rung[0].z);
    positions.push(rung[1].x, rung[1].y, rung[1].z);
    // Each rung is a line segment connecting the two vertices
    indices.push(vertexIndex, vertexIndex + 1);
    vertexIndex += 2;
  });

  loftGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  loftGeometry.setIndex(indices);
  loftGeometry.attributes.position.needsUpdate = true;

  // Update surface geometry (quads between consecutive rungs)
  const surfaceGeometry = loftSurfaceRefs.current.get(loftId);
  if (surfaceGeometry && rungs.length >= 2) {
    const surfacePositions: number[] = [];
    const surfaceIndices: number[] = [];
    let surfaceVertexIndex = 0;

    for (let i = 0; i < rungs.length - 1; i++) {
      const rung1 = rungs[i];
      const rung2 = rungs[i + 1];
      // Quad vertices: rung1[0], rung1[1], rung2[1], rung2[0]
      surfacePositions.push(
        rung1[0].x,
        rung1[0].y,
        rung1[0].z,
        rung1[1].x,
        rung1[1].y,
        rung1[1].z,
        rung2[1].x,
        rung2[1].y,
        rung2[1].z,
        rung2[0].x,
        rung2[0].y,
        rung2[0].z
      );
      // Two triangles: v0-v1-v2, v0-v2-v3
      surfaceIndices.push(
        surfaceVertexIndex,
        surfaceVertexIndex + 1,
        surfaceVertexIndex + 2,
        surfaceVertexIndex,
        surfaceVertexIndex + 2,
        surfaceVertexIndex + 3
      );
      surfaceVertexIndex += 4;
    }

    surfaceGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(surfacePositions, 3)
    );
    surfaceGeometry.setIndex(surfaceIndices);
    surfaceGeometry.attributes.position.needsUpdate = true;
    surfaceGeometry.computeVertexNormals();
  }
}
