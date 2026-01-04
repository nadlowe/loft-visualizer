"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export function DraggableMesh({
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
        side={THREE.DoubleSide}
        color={isDragging ? dragColor : defaultColor}
        opacity={isDragging ? 0.8 : 1}
        transparent
      />
    </mesh>
  );
}
