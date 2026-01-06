"use client";
import { useStore } from "@/lib/state/useStore";
import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { Grid } from "./Grid";
import { LoftCmd } from "./LoftCmd";
import { PolylineCmd } from "./PolylineCmd";
import { PolylineVertexEditing } from "./PolylineVertexEditing";
import { RenderEntities } from "./RenderEntities";
import { Selection } from "./Selection";

export function Scene({
  is2D,
  controlsRef,
}: {
  is2D: boolean;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingVertex, setIsDraggingVertex] = useState(false);
  const editingPolylineId = useStore((state) => state.editingPolylineId);

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
      <RenderEntities onDraggingChange={setIsDragging} />
      <Selection is2D={is2D} />

      {/* Vertex editing */}
      {editingPolylineId && (
        <PolylineVertexEditing
          polylineId={editingPolylineId}
          onDraggingChange={setIsDraggingVertex}
        />
      )}

      {/* Commands */}
      <PolylineCmd />
      <LoftCmd />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, -5, -5]} intensity={0.5} />

      <OrbitControls
        ref={controlsRef}
        enableDamping={false}
        minDistance={1}
        maxDistance={is2D ? 2000 : 5000}
        rotateSpeed={0.5}
        zoomSpeed={1.2}
        screenSpacePanning={true}
        enablePan={(!isDragging && !isDraggingVertex) || is2D}
        enableZoom={true}
        enableRotate={!is2D && !isDragging && !isDraggingVertex}
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
