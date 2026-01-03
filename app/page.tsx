"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "../lib/utils";
import { faceToThree } from "../lib/geomToThree";
import { testPacManFaces } from "../lib/testPacMan";
import { InfiniteGrid } from "@/components/InfiniteGrid";
import { DraggableMesh } from "@/components/DraggableMesh";

function Scene({
  is2D,
  controlsRef,
}: {
  is2D: boolean;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const [isDragging, setIsDragging] = useState(false);

  // Convert Pac-Man faces to Three.js geometries and extract initial positions
  const pacManData = useMemo(() => {
    return testPacManFaces.map((face) => {
      const geometry = faceToThree(face);
      // Extract position from face.plane.origin for initial positioning
      // Use directly - no coordinate conversion (THREE.js uses Z as up)
      const origin = face.plane.origin;
      const initialPosition: [number, number, number] = [
        origin[0],
        origin[1],
        origin[2],
      ];
      return { geometry, initialPosition };
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
      {pacManData.map(({ geometry, initialPosition }, index) => (
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
      <InfiniteGrid cellSize={1} sectionSize={12} />
    </>
  );
}

function CameraController({
  is2D,
  controlsRef,
}: {
  is2D: boolean;
  controlsRef: React.RefObject<any>;
}) {
  const { set, camera, size } = useThree();
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const perspCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  // Store camera state in memory (clears on refresh)
  const camera2DStateRef = useRef<{
    position: [number, number, number];
    rotation: [number, number, number];
    zoom: number;
    target: [number, number, number];
  } | null>(null);
  const camera3DStateRef = useRef<{
    position: [number, number, number];
    rotation: [number, number, number];
    zoom: number;
    target: [number, number, number];
  } | null>(null);

  useEffect(() => {
    if (is2D) {
      // Save current 3D camera state before switching
      if (perspCameraRef.current && controlsRef.current) {
        camera3DStateRef.current = {
          position: perspCameraRef.current.position.toArray() as [
            number,
            number,
            number,
          ],
          rotation: perspCameraRef.current.rotation.toArray() as [
            number,
            number,
            number,
          ],
          zoom: perspCameraRef.current.zoom,
          target: controlsRef.current.target.toArray() as [
            number,
            number,
            number,
          ],
        };
      }

      const aspect = size.width / size.height;
      const viewSize = 10;

      let orthoCamera: THREE.OrthographicCamera;
      if (orthoCameraRef.current) {
        orthoCamera = orthoCameraRef.current;
        // Update bounds on resize
        orthoCamera.left = -viewSize * aspect;
        orthoCamera.right = viewSize * aspect;
        orthoCamera.top = viewSize;
        orthoCamera.bottom = -viewSize;
      } else {
        orthoCamera = new THREE.OrthographicCamera(
          -viewSize * aspect,
          viewSize * aspect,
          viewSize,
          -viewSize,
          0.1,
          10000
        );

        // Restore saved state if available
        if (camera2DStateRef.current) {
          orthoCamera.position.fromArray(camera2DStateRef.current.position);
          orthoCamera.rotation.fromArray(camera2DStateRef.current.rotation);
          orthoCamera.zoom = camera2DStateRef.current.zoom;
          orthoCamera.up.set(0, 1, 0);
        } else {
          orthoCamera.position.set(0, 0, 10);
          orthoCamera.up.set(0, 1, 0);
          orthoCamera.lookAt(0, 0, 0);
        }
      }

      orthoCamera.updateProjectionMatrix();
      orthoCameraRef.current = orthoCamera;
      set({ camera: orthoCamera });

      // Restore OrbitControls target after camera is set
      if (camera2DStateRef.current?.target && controlsRef.current) {
        // Use setTimeout to ensure controls are ready
        setTimeout(() => {
          if (controlsRef.current) {
            controlsRef.current.target.fromArray(
              camera2DStateRef.current!.target
            );
            // Don't call update() in 2D mode as it resets camera rotation
          }
        }, 0);
      }
    } else {
      // Save current 2D camera state before switching
      if (orthoCameraRef.current && controlsRef.current) {
        camera2DStateRef.current = {
          position: orthoCameraRef.current.position.toArray() as [
            number,
            number,
            number,
          ],
          rotation: orthoCameraRef.current.rotation.toArray() as [
            number,
            number,
            number,
          ],
          zoom: orthoCameraRef.current.zoom,
          target: controlsRef.current.target.toArray() as [
            number,
            number,
            number,
          ],
        };
      }

      let perspCamera: THREE.PerspectiveCamera;
      if (perspCameraRef.current) {
        perspCamera = perspCameraRef.current;
        perspCamera.aspect = size.width / size.height;
      } else {
        perspCamera = new THREE.PerspectiveCamera(
          75,
          size.width / size.height,
          0.1,
          10000
        );

        // Restore saved state if available
        if (camera3DStateRef.current) {
          perspCamera.position.fromArray(camera3DStateRef.current.position);
          perspCamera.rotation.fromArray(camera3DStateRef.current.rotation);
          perspCamera.zoom = camera3DStateRef.current.zoom;
          perspCamera.up.set(0, 0, 1);
        } else {
          perspCamera.position.set(0, -5, 5);
          perspCamera.up.set(0, 0, 1);
          perspCamera.lookAt(0, 0, 0);
        }
      }

      perspCamera.updateProjectionMatrix();
      perspCameraRef.current = perspCamera;
      set({ camera: perspCamera });

      // Restore OrbitControls target after camera is set
      if (camera3DStateRef.current?.target && controlsRef.current) {
        // Use setTimeout to ensure controls are ready
        setTimeout(() => {
          if (controlsRef.current) {
            controlsRef.current.target.fromArray(
              camera3DStateRef.current!.target
            );
            controlsRef.current.update();
          }
        }, 0);
      }
    }
  }, [is2D, set, size, controlsRef]);

  // Update orthographic camera bounds on resize
  useEffect(() => {
    if (is2D && orthoCameraRef.current) {
      const aspect = size.width / size.height;
      const viewSize = 10;
      orthoCameraRef.current.left = -viewSize * aspect;
      orthoCameraRef.current.right = viewSize * aspect;
      orthoCameraRef.current.top = viewSize;
      orthoCameraRef.current.bottom = -viewSize;
      orthoCameraRef.current.updateProjectionMatrix();
    } else if (!is2D && perspCameraRef.current) {
      perspCameraRef.current.aspect = size.width / size.height;
      perspCameraRef.current.updateProjectionMatrix();
    }
  }, [size, is2D]);

  return null;
}

export default function Home() {
  const [is2D, setIs2D] = useState(false);
  const controlsRef = useRef<any>(null);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-900">
      {/* Toggle button */}
      <button
        onClick={() => setIs2D(!is2D)}
        className={cn(
          "absolute top-4 right-4 z-10 rounded-md px-4 py-2 text-sm font-medium transition-colors",
          is2D
            ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        )}
      >
        {is2D ? "Switch to 3D" : "Switch to 2D"}
      </button>

      <div className="h-full w-full">
        <Canvas gl={{ antialias: true, alpha: false }}>
          <CameraController is2D={is2D} controlsRef={controlsRef} />
          <Scene is2D={is2D} controlsRef={controlsRef} />
        </Canvas>
      </div>
    </div>
  );
}
