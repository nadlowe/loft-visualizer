"use client";

import { colors } from "@/components/colors";
import { vertexHandleToHash } from "@/lib/entity/handleTools/handleTools";
import type { VertexHandle as VertexHandleType } from "@/lib/entity/handleTypes";
import { PolylineId } from "@/lib/util/uid";
import { ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

interface VertexHandleProps {
  vertex: THREE.Vector3;
  vertexIndex: number;
  polylineId: PolylineId;
  isSelected: boolean;
  onDragStart: () => void;
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
}

export function VertexHandle({
  vertex,
  vertexIndex,
  polylineId,
  isSelected,
  onDragStart,
  onPointerDown,
}: VertexHandleProps) {
  const handle: VertexHandleType = {
    type: "VERTEX",
    polylineId,
    vertexIndex,
  };
  const groupRef = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    if (groupRef.current) {
      // Get world position of the group (important when it's a child of work plane)
      const worldPos = new THREE.Vector3();
      groupRef.current.getWorldPosition(worldPos);

      // Calculate world units per pixel for screen-space scaling
      let worldUnitsPerPixel: number;
      if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
        const orthoCamera = camera as THREE.OrthographicCamera;
        const visibleHeight =
          (orthoCamera.top - orthoCamera.bottom) / orthoCamera.zoom;
        worldUnitsPerPixel = visibleHeight / size.height;
      } else {
        // For perspective camera, use distance-based scaling with world position
        const distance = camera.position.distanceTo(worldPos);
        const fov = (camera as THREE.PerspectiveCamera).fov || 75;
        const vFov = (fov * Math.PI) / 180;
        const visibleHeight = 2 * Math.tan(vFov / 2) * distance;
        worldUnitsPerPixel = visibleHeight / size.height;
      }

      // ~3 pixel radius sphere (geometry has 0.05 base radius, so scale accordingly)
      const pixelSize = 3;
      const scale = (pixelSize * worldUnitsPerPixel) / 0.05;
      if (scale > 0 && isFinite(scale)) {
        groupRef.current.scale.setScalar(scale);
      }
    }
  });

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.color.setHex(
        isSelected ? colors.canvas.selected : colors.canvas.white
      );
    }
  }, [isSelected]);

  return (
    <group ref={groupRef} position={vertex}>
      {/* Transparent larger hit area for easier clicking */}
      <mesh
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDown(e);
          onDragStart();
        }}
        userData={{ handleHash: vertexHandleToHash(handle) }}
      >
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Visible smaller sphere */}
      <mesh>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial
          ref={materialRef}
          color={isSelected ? colors.canvas.selected : colors.canvas.white}
        />
      </mesh>
    </group>
  );
}
