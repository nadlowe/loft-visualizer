"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { faceToThree } from "@/lib/geomToThree";
import { testPacManFaces } from "@/lib/testPacMan";
import { InfiniteGrid } from "@/components/InfiniteGrid";

function DraggableMesh({
    initialPosition = [0, 0, 0],
    onDraggingChange,
    children,
    geometry,
    defaultColor = "orange",
    dragColor = "hotpink",
}: {
    initialPosition?: [number, number, number];
    onDraggingChange?: (isDragging: boolean) => void;
    children?: React.ReactNode;
    geometry?: THREE.BufferGeometry;
    defaultColor?: string;
    dragColor?: string;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] =
        useState<[number, number, number]>(initialPosition);
    const { raycaster, camera, pointer, gl } = useThree();
    const offsetRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const pointerIdRef = useRef<number | null>(null);

    // X-Z plane is the horizontal plane in Three.js (Y is up)
    // Plane normal (0, 1, 0) with constant -Y defines the X-Z plane at height Y
    const getPlane = () => {
        return new THREE.Plane(new THREE.Vector3(0, 1, 0), -position[1]);
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
            // Intersection is on X-Z plane, so use X and Z, keep Y constant
            const planeIntersection = new THREE.Vector3(
                intersection.x,
                position[1],
                intersection.z
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

    useFrame(() => {
        if (!isDragging || !meshRef.current) return;

        const plane = getPlane();
        const intersection = new THREE.Vector3();
        raycaster.setFromCamera(pointer, camera);

        if (raycaster.ray.intersectPlane(plane, intersection)) {
            // Apply offset and constrain to X-Z plane (keep Y constant)
            const newPos = intersection.clone().add(offsetRef.current);
            setPosition([newPos.x, position[1], newPos.z]);
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

function Scene({ is2D }: { is2D: boolean }) {
    const { camera } = useThree();
    const controlsRef = useRef<any>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Convert Pac-Man faces to Three.js geometries and extract initial positions
    const pacManData = useMemo(() => {
        return testPacManFaces.map((face) => {
            const { geometry, position: initialPosition } = faceToThree(face);
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
                <coneGeometry args={[0.7, 1, 4]} />
            </DraggableMesh>

            {/* Orbit Controls - locked orientation in 2D mode, disabled when dragging in 3D */}
            <OrbitControls
                ref={controlsRef}
                enableDamping
                dampingFactor={0.05}
                minDistance={1}
                maxDistance={is2D ? 2000 : 5000}
                rotateSpeed={0.5}
                panSpeed={0.8}
                zoomSpeed={is2D ? 0.5 : 1.2} // Slower zoom for orthographic
                enablePan={!isDragging || is2D} // Disable pan when dragging in 3D
                enableZoom={!isDragging || is2D} // Disable zoom when dragging in 3D
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

function CameraController({ is2D }: { is2D: boolean }) {
    const { set, camera, size } = useThree();
    const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);

    useEffect(() => {
        if (is2D) {
            // Create orthographic camera
            const aspect = size.width / size.height;
            const viewSize = 10;
            const orthoCamera = new THREE.OrthographicCamera(
                -viewSize * aspect, // left
                viewSize * aspect, // right
                viewSize, // top
                -viewSize, // bottom
                0.1, // near
                1000 // far
            );

            orthoCamera.position.set(0, 10, 0);
            orthoCamera.up.set(1, 0, 0);
            orthoCamera.lookAt(0, 0, 0);

            const forward = new THREE.Vector3();
            orthoCamera.getWorldDirection(forward);
            orthoCamera.rotateOnAxis(forward, -Math.PI / 2);

            orthoCamera.updateProjectionMatrix();

            orthoCameraRef.current = orthoCamera;
            set({ camera: orthoCamera });
        } else {
            // Switch back to perspective camera
            const perspCamera = new THREE.PerspectiveCamera(
                75,
                size.width / size.height,
                0.1,
                1000
            );
            perspCamera.position.set(0, 0, 5);
            perspCamera.lookAt(0, 0, 0);
            perspCamera.up.set(0, 1, 0);
            perspCamera.updateProjectionMatrix();
            set({ camera: perspCamera });
        }
    }, [is2D, set, size]);

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
        } else if (!is2D && camera instanceof THREE.PerspectiveCamera) {
            camera.aspect = size.width / size.height;
            camera.updateProjectionMatrix();
        }
    }, [size, is2D, camera]);

    return null;
}

export default function Home() {
    const [is2D, setIs2D] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Loft Visualizer
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        A simple app for authoring and visualizing loft geometry
                    </p>
                </div>

                <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
                    {/* Toggle button */}
                    <div className="mb-4 flex justify-end">
                        <button
                            onClick={() => setIs2D(!is2D)}
                            className={cn(
                                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                                is2D
                                    ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                            )}
                        >
                            {is2D ? "Switch to 3D" : "Switch to 2D"}
                        </button>
                    </div>

                    <div className="h-[600px] w-full overflow-hidden rounded-lg bg-gray-900">
                        <Canvas gl={{ antialias: true, alpha: false }}>
                            <CameraController is2D={is2D} />
                            <Scene is2D={is2D} />
                        </Canvas>
                    </div>
                </div>
            </div>
        </div>
    );
}
