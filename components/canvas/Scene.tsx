"use client";
import { faceToThree } from "@/lib/conversion/geomToThree";
import { testPacManFaces } from "@/lib/testPacMan";
import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useState, useMemo, useEffect } from "react";
import * as THREE from "three";
import { DraggableMesh } from "./DraggableMesh";
import { Grid } from "./Grid";

export function Scene({
  is2D,
  controlsRef,
}: {
  is2D: boolean;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const [isDragging, setIsDragging] = useState(false);

  // Convert Pac-Man faces to Three.js geometries and extract initial positions
  const faceData = useMemo(() => {
    return testPacManFaces.map((face) => {
      const { geometry, position } = faceToThree(face);
      return { geometry, initialPosition: position };
    });
  }, []);

  useEffect(() => {
    // Reset controls target when camera changes
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      // Don't call update() in 2D mode as it resets camera rotation
      // Only update in 3D mode
      if (!is2D) {
        controlsRef.current.update();
      }
    }
  }, [is2D, camera]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, -5, -5]} intensity={0.5} />

      {/* Render draggable Pac-Man faces */}
      {faceData.map(({ geometry, initialPosition }, index) => (
        <DraggableMesh
          key={index}
          initialPosition={initialPosition}
          onDraggingChange={setIsDragging}
          geometry={geometry}
          defaultColor={index % 2 === 0 ? "#FFD700" : "#FFA500"} // Gold and orange
          dragColor={index % 2 === 0 ? "#FFA500" : "#FF8C00"} // Darker orange when dragging
        >
          <meshStandardMaterial side={THREE.DoubleSide} />
        </DraggableMesh>
      ))}

      {/* Draggable cube */}
      <DraggableMesh
        initialPosition={[0, 0, 0]}
        onDraggingChange={setIsDragging}
        defaultColor="orange"
        dragColor="hotpink"
      >
        <boxGeometry args={[1, 1, 1]} />
      </DraggableMesh>

      {/* Draggable pyramid */}
      <DraggableMesh
        initialPosition={[2, 0, 0]}
        onDraggingChange={setIsDragging}
        defaultColor="blue"
        dragColor="cyan"
      >
        <meshStandardMaterial />
        {/* Rotate cone to point along Z axis instead of Y */}
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <coneGeometry args={[0.7, 1, 4]} />
          </mesh>
        </group>
      </DraggableMesh>

      {/* Orbit Controls - locked orientation in 2D mode, disabled when dragging in 3D */}
      <OrbitControls
        ref={controlsRef}
        enableDamping={false}
        minDistance={1}
        maxDistance={is2D ? 2000 : 5000}
        rotateSpeed={0.5}
        //panSpeed={1.0}
        zoomSpeed={1.2} // Slower zoom for orthographic
        screenSpacePanning={true} // Makes panning feel like grabbing and dragging the canvas
        enablePan={!isDragging || is2D} // Disable pan when dragging in 3D
        enableZoom={true} // Disable zoom when dragging in 3D
        enableRotate={!is2D && !isDragging} // Disable rotation when dragging in 3D or in 2D
        // Lock polar angle to top-down (90 degrees = Math.PI / 2)
        minPolarAngle={is2D ? Math.PI / 2 : 0}
        maxPolarAngle={is2D ? Math.PI / 2 : Math.PI}
        // Allow azimuth rotation in 2D to match camera rotation
        // Don't lock it to 0, allow the 90° rotation
        minAzimuthAngle={is2D ? -Infinity : -Infinity}
        maxAzimuthAngle={is2D ? Infinity : Infinity}
      />

      {/* Helpers */}
      <axesHelper args={[2]} />
      <Grid cellSize={1} sectionSize={12} followCamera={true} />
    </>
  );
}
