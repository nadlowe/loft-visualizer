"use client";
import { colors } from "@/components/ui/colors";
import { renderDoc, WorkPlane } from "@/lib/conversion/geomToThree";
import { workPlaneToPlane3 } from "@/lib/conversion/threeToGeom";
import { handleNew } from "@/lib/entity/handle";
import { useStore } from "@/lib/state/useStore";
import { WorkPlaneId } from "@/lib/util/uid";
import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { Grid } from "./Grid";
import { PolylineDrawing } from "./PolylineDrawing";
import { PolylineSelection } from "./PolylineSelection";
import { WorkPlaneWidget } from "./WorkPlaneWidget";

export function Scene({
  is2D,
  controlsRef,
}: {
  is2D: boolean;
  controlsRef: React.RefObject<any>;
}) {
  const { camera, size } = useThree();
  const { doc, isSelected, updateWorkPlane, selectOnly, toggleSelection } =
    useStore();
  const [isDragging, setIsDragging] = useState(false);

  const { workPlanes, polylines, lofts } = useMemo(() => renderDoc(doc), [doc]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      if (!is2D) {
        controlsRef.current.update();
      }
    }
  }, [is2D, camera, controlsRef]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, -5, -5]} intensity={0.5} />

      {/* Render work planes from doc */}
      {workPlanes.map(({ workPlane, id }) => {
        const handle = handleNew("WORKPLANE", id as WorkPlaneId);
        const selected = isSelected(handle);
        const workPlaneId = id as WorkPlaneId;

        const handleWorkPlaneChange = (updatedWorkPlane: WorkPlane) => {
          const plane3 = workPlaneToPlane3(updatedWorkPlane);
          updateWorkPlane(workPlaneId, (entity) => ({
            ...entity,
            plane3,
          }));
        };

        const workPlanePolylines = polylines.filter(
          (p) => p.workPlaneId === id
        );

        return (
          <primitive key={id} object={workPlane}>
            {workPlanePolylines.map(({ path, id: polylineId }) => {
              const pathPoints = path
                .getPoints(50)
                .map((p) => new THREE.Vector3(p.x, p.y, 0));
              const positions: number[] = [];
              pathPoints.forEach((p) => {
                positions.push(p.x, p.y, p.z);
              });

              const geometry = new LineGeometry();
              geometry.setPositions(positions);

              const polylineHandle = handleNew("POLYLINE", polylineId as any);
              const polylineSelected = isSelected(polylineHandle);
              const color = polylineSelected
                ? colors.selection.highlight
                : 0xffffff;

              const material = new LineMaterial({
                color,
                linewidth: 1.5,
                resolution: new THREE.Vector2(size.width, size.height),
              });

              const line = new Line2(geometry, material);
              line.userData.handle = polylineHandle;
              line.userData.pathPoints = pathPoints;
              return <primitive key={polylineId} object={line} />;
            })}
          </primitive>
        );
      })}

      {/* Render work plane widgets for selected work planes */}
      {workPlanes.map(({ workPlane, id }) => {
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

        return (
          <WorkPlaneWidget
            key={`widget-${id}`}
            workPlane={workPlane as any}
            onWorkPlaneChange={handleWorkPlaneChange}
            onDraggingChange={setIsDragging}
            enabled={true}
            showTranslate={true}
            showRotate={true}
            showHelpers={true}
          />
        );
      })}

      {/* Render polylines without work planes */}
      {polylines
        .filter((p) => !p.workPlaneId)
        .map(({ path, id }) => {
          const pathPoints = path
            .getPoints(50)
            .map((p) => new THREE.Vector3(p.x, p.y, 0));
          const positions: number[] = [];
          pathPoints.forEach((p) => {
            positions.push(p.x, p.y, p.z);
          });

          const geometry = new LineGeometry();
          geometry.setPositions(positions);

          const handle = handleNew("POLYLINE", id as any);
          const selected = isSelected(handle);
          const color = selected ? colors.selection.highlight : 0xffffff;

          const material = new LineMaterial({
            color,
            linewidth: 1.5,
            resolution: new THREE.Vector2(size.width, size.height),
          });

          const line = new Line2(geometry, material);
          line.userData.handle = handle;
          line.userData.pathPoints = pathPoints;
          return <primitive key={id} object={line} />;
        })}

      {/* Render lofts */}
      {lofts.map(({ geometry, id }) => {
        const handle = handleNew("LOFT", id as any);
        const selected = isSelected(handle);
        const color = selected ? colors.selection.highlight : 0x888888;
        return (
          <lineSegments
            key={id}
            geometry={geometry}
            userData={{ handle }}
            onClick={(e) => {
              e.stopPropagation();
              if (e.shiftKey || e.metaKey || e.ctrlKey) {
                toggleSelection(handle);
              } else {
                selectOnly(handle);
              }
            }}
          >
            <lineBasicMaterial color={color} />
          </lineSegments>
        );
      })}

      {/* Polyline drawing interaction and preview */}
      <PolylineDrawing />

      {/* Polyline selection */}
      <PolylineSelection is2D={is2D} />

      <OrbitControls
        ref={controlsRef}
        enableDamping={false}
        minDistance={1}
        maxDistance={is2D ? 2000 : 5000}
        rotateSpeed={0.5}
        zoomSpeed={1.2}
        screenSpacePanning={true}
        enablePan={!isDragging || is2D}
        enableZoom={true}
        enableRotate={!is2D && !isDragging}
        minPolarAngle={is2D ? Math.PI / 2 : 0}
        maxPolarAngle={is2D ? Math.PI / 2 : Math.PI}
        minAzimuthAngle={is2D ? -Infinity : -Infinity}
        maxAzimuthAngle={is2D ? Infinity : Infinity}
      />

      {/* Helpers */}
      <axesHelper args={[2]} />
      <Grid cellSize={1} sectionSize={12} followCamera={true} />
    </>
  );
}
