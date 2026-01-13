"use client";
import { useStore } from "@/store/useStore";
import { OrbitControls } from "@react-three/drei";
import { useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { LoftCmd } from "./cmd/LoftCmd";
import { PolylineCmd } from "./cmd/PolylineCmd";
import { DebugPolylines } from "./DebugPolylines";
import { Grid } from "./Grid";
import { PolylineVertexEditing } from "./polylineVertexEditing/PolylineVertexEditing";
import { RenderEntities } from "./RenderEntities";
import { Selection } from "./Selection";

export function Scene({
  is2D,
  controlsRef,
}: {
  is2D: boolean;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingVertex, setIsDraggingVertex] = useState(false);
  const editingPolylineId = useStore((state) => state.editingPolylineId);

  return (
    <>
      <RenderEntities onDraggingChange={setIsDragging} />
      <Selection
        is2D={is2D}
        onDraggingChange={setIsDragging}
        isDraggingWorkPlane={isDragging}
      />

      {/* Vertex editing */}
      {editingPolylineId && (
        <PolylineVertexEditing
          polylineId={editingPolylineId}
          is2D={is2D}
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
        maxDistance={is2D ? 25000 : 5000}
        rotateSpeed={0.5}
        zoomSpeed={1.2}
        screenSpacePanning={true}
        enablePan={!isDragging && !isDraggingVertex}
        enableZoom={true}
        enableRotate={!is2D && !isDragging && !isDraggingVertex}
        minPolarAngle={is2D ? Math.PI / 2 : 0}
        maxPolarAngle={is2D ? Math.PI / 2 : Math.PI}
        minAzimuthAngle={is2D ? 0 : -Infinity}
        maxAzimuthAngle={is2D ? 0 : Infinity}
      />

      {/* Helpers */}
      <axesHelper args={[2]} />
      <Grid cellSize={1} sectionSize={12} followCamera={true} />

      {/* Debug visualization */}
      <DebugPolylines />
    </>
  );
}
