"use client";
import { colors } from "@/components/colors";
import {
  LOFT_SUBDIVISIONS,
  loftTableToThree,
  polyline2ToWorldVertices,
  polylineTableToThree,
  WorkPlane,
  workPlanesTableToThree,
} from "@/lib/conversion/geomToThree";
import { workPlaneToPlane3 } from "@/lib/conversion/threeToGeom";
import { handleNew } from "@/lib/entity/handle";
import { EntityHandle, handleToHash } from "@/lib/entity/handleTypes";
import { polyline2Shift } from "@/lib/geom/polyline2";
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
  const updateEntity = useStore((state) => state.updateEntity);

  const [isDragging, setIsDragging] = useState(false);
  const workPlaneRefs = useRef<Map<string, THREE.Group>>(new Map());
  const lineRefs = useRef<Map<string, LineGeometry>>(new Map());
  const loftRefs = useRef<Map<string, THREE.BufferGeometry>>(new Map());
  const loftSurfaceRefs = useRef<Map<string, THREE.BufferGeometry>>(new Map());
  const loftWireframeRefs = useRef<Map<string, THREE.BufferGeometry>>(
    new Map()
  );

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
        // Build rung line geometry
        const positions: number[] = [];
        const indices: number[] = [];
        let vertexIndex = 0;

        l.rungs.forEach((rung) => {
          positions.push(rung[0].x, rung[0].y, rung[0].z);
          positions.push(rung[1].x, rung[1].y, rung[1].z);
          indices.push(vertexIndex, vertexIndex + 1);
          vertexIndex += 2;
        });

        const existingGeometry = loftRefs.current.get(l.id);
        const newVertexCount = positions.length / 3;
        const existingVertexCount = existingGeometry
          ? (existingGeometry.attributes.position?.count ?? 0)
          : 0;

        // Recreate geometry if vertex count changed, otherwise update in place
        if (existingGeometry && existingVertexCount === newVertexCount) {
          const posAttr = existingGeometry.attributes
            .position as THREE.BufferAttribute;
          posAttr.array.set(positions);
          posAttr.needsUpdate = true;
        } else {
          if (existingGeometry) {
            existingGeometry.dispose();
          }
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(positions, 3)
          );
          geometry.setIndex(indices);
          loftRefs.current.set(l.id, geometry);
        }

        // Create/update surface geometry with subdivision across rungs
        if (l.rungs.length >= 2) {
          const rungSubdivisions = l.subdivisions || LOFT_SUBDIVISIONS;
          const { surfacePositions, surfaceIndices, wireframeIndices } =
            generateSubdividedSurface(l.rungs, rungSubdivisions);

          const existingSurfaceGeometry = loftSurfaceRefs.current.get(l.id);
          const newVertexCount = surfacePositions.length / 3;
          const existingVertexCount = existingSurfaceGeometry
            ? (existingSurfaceGeometry.attributes.position?.count ?? 0)
            : 0;

          // Recreate geometry if vertex count changed, otherwise update in place
          if (
            existingSurfaceGeometry &&
            existingVertexCount === newVertexCount
          ) {
            const posAttr = existingSurfaceGeometry.attributes
              .position as THREE.BufferAttribute;
            posAttr.array.set(surfacePositions);
            posAttr.needsUpdate = true;
            existingSurfaceGeometry.computeVertexNormals();
          } else {
            if (existingSurfaceGeometry) {
              existingSurfaceGeometry.dispose();
            }
            const surfaceGeometry = new THREE.BufferGeometry();
            surfaceGeometry.setAttribute(
              "position",
              new THREE.Float32BufferAttribute(surfacePositions, 3)
            );
            surfaceGeometry.setIndex(surfaceIndices);
            surfaceGeometry.computeVertexNormals();
            loftSurfaceRefs.current.set(l.id, surfaceGeometry);
          }

          // Create/update wireframe geometry for subdivision edges
          const existingWireframeGeometry = loftWireframeRefs.current.get(l.id);
          const existingWireframeVertexCount = existingWireframeGeometry
            ? (existingWireframeGeometry.attributes.position?.count ?? 0)
            : 0;

          if (
            existingWireframeGeometry &&
            existingWireframeVertexCount === newVertexCount
          ) {
            const posAttr = existingWireframeGeometry.attributes
              .position as THREE.BufferAttribute;
            posAttr.array.set(surfacePositions);
            posAttr.needsUpdate = true;
          } else {
            if (existingWireframeGeometry) {
              existingWireframeGeometry.dispose();
            }
            const wireframeGeometry = new THREE.BufferGeometry();
            wireframeGeometry.setAttribute(
              "position",
              new THREE.Float32BufferAttribute(surfacePositions, 3)
            );
            wireframeGeometry.setIndex(wireframeIndices);
            loftWireframeRefs.current.set(l.id, wireframeGeometry);
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
      {renderedWorkPlanes
        .filter(({ id }) => !workPlanes[id as WorkPlaneId]?.hidden)
        .map(({ workPlane, id }) => {
          const workPlaneId = id as WorkPlaneId;

          const workPlanePolylines = renderedPolylines.filter(
            (p) =>
              p.workPlaneId === id && !polylines[p.id as PolylineId]?.hidden
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
                  loftSurfaceRefs,
                  loftWireframeRefs
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
        .filter((p) => !p.workPlaneId && !polylines[p.id as PolylineId]?.hidden)
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
      {renderedLofts
        .filter((l) => !lofts[l.id as any]?.hidden)
        .map((loft) => {
          const handle = handleNew("LOFT", loft.id as any);
          const geometry = loftRefs.current.get(loft.id);
          const surfaceGeometry = loftSurfaceRefs.current.get(loft.id);
          const wireframeGeometry = loftWireframeRefs.current.get(loft.id);
          if (!geometry) return null;
          const selected = isSelected(handle);
          const color = selected ? colors.canvas.selected : colors.canvas.unselected;
          // Flatten rungs for pathPoints (used for selection)
          const pathPoints = loft.rungs.flat();
          return (
            <group key={loft.id}>
              {/* Surface mesh with 20% opacity */}
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
              {/* Wireframe showing subdivision edges */}
              {wireframeGeometry && (
                <lineSegments geometry={wireframeGeometry}>
                  <lineBasicMaterial color={color} transparent opacity={0.75} />
                </lineSegments>
              )}
              {/* Line segments (rungs) */}
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

// Generate subdivided surface geometry with wireframe indices
function generateSubdividedSurface(
  rungs: THREE.Vector3[][],
  rungSubdivisions: number
): {
  surfacePositions: number[];
  surfaceIndices: number[];
  wireframeIndices: number[];
} {
  const surfacePositions: number[] = [];
  const surfaceIndices: number[] = [];
  const wireframeIndices: number[] = [];

  // Build a grid of vertices by subdividing across each rung
  // Match horizontal subdivisions: subdivisions=3 means 4 segments (subdivisions + 1)
  // Grid dimensions: (rungs.length) rows x (rungSubdivisions + 2) columns
  const gridRows = rungs.length;
  const gridCols = rungSubdivisions + 2; // +2 to match horizontal (subdivisions + 1 segments)

  // Generate all vertices in the grid
  for (let row = 0; row < gridRows; row++) {
    const rung = rungs[row];
    const p1 = rung[0];
    const p2 = rung[1];
    for (let col = 0; col < gridCols; col++) {
      const t = col / (gridCols - 1);
      const point = new THREE.Vector3().lerpVectors(p1, p2, t);
      surfacePositions.push(point.x, point.y, point.z);
    }
  }

  // Generate triangles and wireframe edges for each quad in the grid
  for (let row = 0; row < gridRows - 1; row++) {
    for (let col = 0; col < gridCols - 1; col++) {
      // Quad vertex indices in the grid
      const v0 = row * gridCols + col; // top-left
      const v1 = (row + 1) * gridCols + col; // bottom-left
      const v2 = (row + 1) * gridCols + (col + 1); // bottom-right
      const v3 = row * gridCols + (col + 1); // top-right

      // Get vertex positions for diagonal selection
      const p0 = new THREE.Vector3(
        surfacePositions[v0 * 3],
        surfacePositions[v0 * 3 + 1],
        surfacePositions[v0 * 3 + 2]
      );
      const p2Pos = new THREE.Vector3(
        surfacePositions[v2 * 3],
        surfacePositions[v2 * 3 + 1],
        surfacePositions[v2 * 3 + 2]
      );
      const p1Pos = new THREE.Vector3(
        surfacePositions[v1 * 3],
        surfacePositions[v1 * 3 + 1],
        surfacePositions[v1 * 3 + 2]
      );
      const p3Pos = new THREE.Vector3(
        surfacePositions[v3 * 3],
        surfacePositions[v3 * 3 + 1],
        surfacePositions[v3 * 3 + 2]
      );

      // Choose the longer diagonal for non-planar quads
      const d02 = p0.distanceToSquared(p2Pos);
      const d13 = p1Pos.distanceToSquared(p3Pos);

      if (d02 >= d13) {
        // Use v0-v2 diagonal
        surfaceIndices.push(v0, v1, v2, v0, v2, v3);
      } else {
        // Use v1-v3 diagonal
        surfaceIndices.push(v0, v1, v3, v1, v2, v3);
      }

      // Wireframe edges (each edge as a line segment)
      // Top edge (only for first row of quads)
      if (row === 0) {
        wireframeIndices.push(v0, v3);
      }
      // Left edge (only for first column of quads)
      if (col === 0) {
        wireframeIndices.push(v0, v1);
      }
      // Bottom edge
      wireframeIndices.push(v1, v2);
      // Right edge
      wireframeIndices.push(v3, v2);
    }
  }

  return { surfacePositions, surfaceIndices, wireframeIndices };
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
        ? colors.canvas.selected
        : colors.canvas.unselected
      : selected
        ? colors.canvas.selected
        : colors.canvas.white;

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

// Subdivide vertices along a polyline by adding intermediate points
function subdivideVertices(
  vertices: THREE.Vector3[],
  subdivisions: number
): THREE.Vector3[] {
  if (vertices.length < 2 || subdivisions < 1) return vertices;

  const result: THREE.Vector3[] = [];
  for (let i = 0; i < vertices.length - 1; i++) {
    result.push(vertices[i].clone());
    const v1 = vertices[i];
    const v2 = vertices[i + 1];
    for (let j = 1; j <= subdivisions; j++) {
      const t = j / (subdivisions + 1);
      result.push(new THREE.Vector3().lerpVectors(v1, v2, t));
    }
  }
  result.push(vertices[vertices.length - 1].clone());
  return result;
}

// Helper function to update loft geometry during dragging
function updateLineGeometry(
  loftId: string,
  loftEntity: {
    polyline1: PolylineId;
    polyline2: PolylineId;
    polyline1Shift?: number;
    polyline2Shift?: number;
  },
  workPlaneId: WorkPlaneId,
  currentWorkPlane: THREE.Group | undefined,
  workPlaneRefs: React.RefObject<Map<string, THREE.Group>>,
  loftRefs: React.RefObject<Map<string, THREE.BufferGeometry>>,
  loftSurfaceRefs: React.RefObject<Map<string, THREE.BufferGeometry>>,
  loftWireframeRefs: React.RefObject<Map<string, THREE.BufferGeometry>>
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

  // Apply loft-level shifts to polyline data, then convert to world space
  const shiftedPolyline1 = polyline2Shift(
    polyline1.polyline,
    loftEntity.polyline1Shift ?? 0
  );
  const shiftedPolyline2 = polyline2Shift(
    polyline2.polyline,
    loftEntity.polyline2Shift ?? 0
  );

  // Recompute vertices in world space
  const vertices1 = polyline2ToWorldVertices(
    shiftedPolyline1,
    wp1 || undefined
  );
  const vertices2 = polyline2ToWorldVertices(
    shiftedPolyline2,
    wp2 || undefined
  );

  // Subdivide both polylines for smoother surfaces
  const subdividedVertices1 = subdivideVertices(vertices1, LOFT_SUBDIVISIONS);
  const subdividedVertices2 = subdivideVertices(vertices2, LOFT_SUBDIVISIONS);

  // Combine vertices into loft segments (ladder rungs: array of arrays)
  const rungs: THREE.Vector3[][] = [];
  const maxCount = Math.max(
    subdividedVertices1.length,
    subdividedVertices2.length
  );
  const lastIdx1 =
    subdividedVertices1.length > 0 ? subdividedVertices1.length - 1 : 0;
  const lastIdx2 =
    subdividedVertices2.length > 0 ? subdividedVertices2.length - 1 : 0;

  for (let i = 0; i < maxCount; i++) {
    const idx1 = Math.min(i, lastIdx1);
    const idx2 = Math.min(i, lastIdx2);
    // Each rung connects corresponding vertices (or last vertex if one is shorter)
    rungs.push([subdividedVertices1[idx1], subdividedVertices2[idx2]]);
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

  // Update surface and wireframe geometry with subdivisions
  const surfaceGeometry = loftSurfaceRefs.current.get(loftId);
  const wireframeGeometry = loftWireframeRefs.current.get(loftId);
  if (surfaceGeometry && rungs.length >= 2) {
    const { surfacePositions, surfaceIndices, wireframeIndices } =
      generateSubdividedSurface(rungs, LOFT_SUBDIVISIONS);

    surfaceGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(surfacePositions, 3)
    );
    surfaceGeometry.setIndex(surfaceIndices);
    surfaceGeometry.attributes.position.needsUpdate = true;
    surfaceGeometry.computeVertexNormals();

    if (wireframeGeometry) {
      wireframeGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(surfacePositions, 3)
      );
      wireframeGeometry.setIndex(wireframeIndices);
      wireframeGeometry.attributes.position.needsUpdate = true;
    }
  }
}
