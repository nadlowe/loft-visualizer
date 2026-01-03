"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "../lib/utils";
import { faceToThree } from "../lib/geomToThree";
import { testPacManFaces } from "../lib/testPacMan";
import { InfiniteGrid } from "@/components/InfiniteGrid";

function DraggableMesh({
  initialPosition = [0, 0, 0],
  onDraggingChange,
  children,
  geometry,
  defaultColor = "orange",
  dragColor = "hotpink",
  snapSize = 1,
}: {
  initialPosition?: [number, number, number];
  onDraggingChange?: (isDragging: boolean) => void;
  children?: React.ReactNode;
  geometry?: THREE.BufferGeometry;
  defaultColor?: string;
  dragColor?: string;
  snapSize?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] =
    useState<[number, number, number]>(initialPosition);
  const { raycaster, camera, pointer, gl } = useThree();
  const offsetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const pointerIdRef = useRef<number | null>(null);

  // X-Y plane is the horizontal plane (Z is up)
  // Plane normal (0, 0, 1) with constant -Z defines the X-Y plane at height Z
  const getPlane = () => {
    return new THREE.Plane(new THREE.Vector3(0, 0, 1), -position[2]);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    onDraggingChange?.(false);
    if (pointerIdRef.current !== null) {
      gl.domElement.releasePointerCapture(pointerIdRef.current);
      pointerIdRef.current = null;
    }
  };

  const handlePointerDown = (e: any) => {
    e.stopPropagation();

    const plane = getPlane();
    const intersection = new THREE.Vector3();
    raycaster.setFromCamera(pointer, camera);

    if (raycaster.ray.intersectPlane(plane, intersection)) {
      // Calculate offset from mesh center to intersection point
      const meshPos = new THREE.Vector3(...position);
      // Intersection is on X-Y plane, so use X and Y, keep Z constant
      const planeIntersection = new THREE.Vector3(
        intersection.x,
        intersection.y,
        position[2]
      );
      offsetRef.current.subVectors(meshPos, planeIntersection);
      setIsDragging(true);
      onDraggingChange?.(true);

      // Capture pointer to continue tracking even outside mesh
      pointerIdRef.current = e.pointerId;
      gl.domElement.setPointerCapture(e.pointerId);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pointerIdRef.current !== null) {
        gl.domElement.releasePointerCapture(pointerIdRef.current);
      }
    };
  }, [gl.domElement]);

  // useFrame(() => {
  //     if (!isDragging || !meshRef.current) return;

  //     const plane = getPlane();
  //     const intersection = new THREE.Vector3();
  //     raycaster.setFromCamera(pointer, camera);

  //     if (raycaster.ray.intersectPlane(plane, intersection)) {
  //         // Apply offset and constrain to X-Y plane (keep Z constant)
  //         const newPos = intersection.clone().add(offsetRef.current);
  //         setPosition([newPos.x, newPos.y, position[2]]);
  //     }
  // });

  useFrame(() => {
    if (!isDragging || !meshRef.current) return;

    const plane = getPlane();
    const intersection = new THREE.Vector3();
    raycaster.setFromCamera(pointer, camera);

    if (raycaster.ray.intersectPlane(plane, intersection)) {
      // Apply offset and constrain to X-Y plane (keep Z constant)
      const newPos = intersection.clone().add(offsetRef.current);

      // Snap to grid
      const snappedX = Math.round(newPos.x / snapSize) * snapSize;
      const snappedY = Math.round(newPos.y / snapSize) * snapSize;

      setPosition([snappedX, snappedY, position[2]]);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      geometry={geometry}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {children}
      <meshStandardMaterial
        color={isDragging ? dragColor : defaultColor}
        opacity={isDragging ? 0.8 : 1}
        transparent
      />
    </mesh>
  );
}

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

  // Load saved camera state from localStorage
  const loadCameraState = (mode: "2D" | "3D") => {
    try {
      const saved = localStorage.getItem(`camera_${mode}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to load camera state", e);
    }
    return null;
  };

  // Save camera state to localStorage
  const saveCameraState = (
    mode: "2D" | "3D",
    camera: THREE.Camera,
    controls?: any
  ) => {
    try {
      const state: any = {
        position: camera.position.toArray(),
        rotation: camera.rotation.toArray(),
        // For orthographic camera, also save bounds
        ...(camera instanceof THREE.OrthographicCamera && {
          zoom: camera.zoom,
          left: camera.left,
          right: camera.right,
          top: camera.top,
          bottom: camera.bottom,
        }),
        // For perspective camera, save fov and zoom
        ...(camera instanceof THREE.PerspectiveCamera && {
          zoom: camera.zoom,
          fov: camera.fov,
        }),
        // Save OrbitControls target if available
        ...(controls && {
          target: controls.target?.toArray() || [0, 0, 0],
        }),
      };
      localStorage.setItem(`camera_${mode}`, JSON.stringify(state));
    } catch (e) {
      console.warn("Failed to save camera state", e);
    }
  };

  useEffect(() => {
    if (is2D) {
      // Save current 3D camera state before switching
      if (perspCameraRef.current && controlsRef.current) {
        saveCameraState("3D", perspCameraRef.current, controlsRef.current);
      }

      const aspect = size.width / size.height;
      const viewSize = 10;

      // Try to load saved state
      const saved = loadCameraState("2D");

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

        if (saved) {
          orthoCamera.position.fromArray(saved.position);
          orthoCamera.rotation.fromArray(saved.rotation);
          orthoCamera.zoom = saved.zoom || 1;
          if (saved.left !== undefined) {
            orthoCamera.left = saved.left;
            orthoCamera.right = saved.right;
            orthoCamera.top = saved.top;
            orthoCamera.bottom = saved.bottom;
          }
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
      if (saved?.target && controlsRef.current) {
        // Use setTimeout to ensure controls are ready
        setTimeout(() => {
          if (controlsRef.current) {
            controlsRef.current.target.fromArray(saved.target);
            // Don't call update() in 2D mode as it resets camera rotation
          }
        }, 0);
      }
    } else {
      // Save current 2D camera state before switching
      if (orthoCameraRef.current && controlsRef.current) {
        saveCameraState("2D", orthoCameraRef.current, controlsRef.current);
      }

      // Try to load saved 3D state
      const saved = loadCameraState("3D");

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

        if (saved) {
          perspCamera.position.fromArray(saved.position);
          perspCamera.rotation.fromArray(saved.rotation);
          perspCamera.zoom = saved.zoom || 1;
          if (saved.fov) perspCamera.fov = saved.fov;
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
      if (saved?.target && controlsRef.current) {
        // Use setTimeout to ensure controls are ready
        setTimeout(() => {
          if (controlsRef.current) {
            controlsRef.current.target.fromArray(saved.target);
            controlsRef.current.update();
          }
        }, 0);
      }
    }
  }, [is2D, set, size, controlsRef]);

  // Save camera state periodically and on unmount
  useEffect(() => {
    const interval = setInterval(() => {
      if (is2D && orthoCameraRef.current && controlsRef.current) {
        saveCameraState("2D", orthoCameraRef.current, controlsRef.current);
      } else if (!is2D && perspCameraRef.current && controlsRef.current) {
        saveCameraState("3D", perspCameraRef.current, controlsRef.current);
      }
    }, 1000); // Save every second

    return () => {
      clearInterval(interval);
      // Save on unmount
      if (is2D && orthoCameraRef.current && controlsRef.current) {
        saveCameraState("2D", orthoCameraRef.current, controlsRef.current);
      } else if (!is2D && perspCameraRef.current && controlsRef.current) {
        saveCameraState("3D", perspCameraRef.current, controlsRef.current);
      }
    };
  }, [is2D, controlsRef]);

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
