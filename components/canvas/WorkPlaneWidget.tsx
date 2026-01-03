"use client";
import { useRef, useEffect, useState } from "react";
import { TransformControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Face } from "@/lib/geom/geomTypes";
import { plane3ToWorkPlane, faceToThree } from "@/lib/conversion/geomToThree";
import { plane3New } from "@/lib/geom/plane3";

interface WorkPlaneWidgetProps {
  shape: Face;
  onShapeChange: (shape: Face) => void;
  onDraggingChange?: (isDragging: boolean) => void;
  enabled?: boolean;
  showHelpers?: boolean;
  showTranslate?: boolean;
  showRotate?: boolean;
}

export function WorkPlaneWidget({
  shape,
  onShapeChange,
  onDraggingChange,
  enabled = true,
  showHelpers = true,
  showTranslate = true,
  showRotate = true,
}: WorkPlaneWidgetProps) {
  // Translation group - handles position in world space
  const translationGroupRef = useRef<THREE.Group>(null);
  // Rotation group - handles plane orientation (normal and u)
  const rotationGroupRef = useRef<THREE.Group>(null);
  // Empty group at origin for rotation controls positioning
  const rotationControlsAnchorRef = useRef<THREE.Group>(null);
  const translateControlsRef = useRef<any>(null);
  const rotateControlsRef = useRef<any>(null);
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  const isRotatingRef = useRef(false);
  const isTranslatingRef = useRef(false);
  const initialRotationRef = useRef<THREE.Euler | null>(null);
  const initialNormalRef = useRef<THREE.Vector3 | null>(null);
  const initialURef = useRef<THREE.Vector3 | null>(null);
  const { camera } = useThree();

  const workPlane = plane3ToWorkPlane(shape.plane);
  const { shapeGeometry } = faceToThree(shape);

  // Track Shift key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift" || e.shiftKey) {
        setIsShiftHeld(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift" || !e.shiftKey) {
        setIsShiftHeld(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Initialize translation group position from workPlane origin
  useEffect(() => {
    if (!translationGroupRef.current) return;
    translationGroupRef.current.position.set(
      workPlane.position[0],
      workPlane.position[1],
      workPlane.position[2]
    );
    // Ensure rotation group stays at origin relative to translation group
    if (rotationGroupRef.current) {
      rotationGroupRef.current.position.set(0, 0, 0);
    }
  }, [workPlane.position]);

  // Initialize rotation group orientation from workPlane matrix
  useEffect(() => {
    if (!rotationGroupRef.current || !rotationControlsAnchorRef.current) return;
    // Don't update if actively dragging
    if (isRotatingRef.current || isTranslatingRef.current) return;
    // Ensure rotation group and anchor are at origin relative to translation group
    rotationGroupRef.current.position.set(0, 0, 0);
    rotationControlsAnchorRef.current.position.set(0, 0, 0);
    // Extract rotation from workPlane matrix (remove translation)
    const rotationMatrix = workPlane.matrix.clone();
    rotationMatrix.setPosition(0, 0, 0);
    const rotation = new THREE.Euler().setFromRotationMatrix(rotationMatrix);
    // Set rotation on both groups so they stay in sync
    rotationControlsAnchorRef.current.rotation.copy(rotation);
    rotationGroupRef.current.rotation.copy(rotation);
  }, [workPlane.matrix]);

  // Handle translation changes - updates plane.origin in world space
  const handleTranslationChange = () => {
    if (!translationGroupRef.current || !isTranslatingRef.current) return;

    const position = translationGroupRef.current.position;

    // Ensure rotation group stays at origin relative to translation group
    if (rotationGroupRef.current) {
      rotationGroupRef.current.position.set(0, 0, 0);
    }

    // Translation directly updates the plane's origin in world coordinates
    // Normal and u remain unchanged
    const newPlane = plane3New(
      [position.x, position.y, position.z],
      shape.plane.normal,
      shape.plane.u
    );

    onShapeChange({
      plane: newPlane,
      polygon: shape.polygon,
    });
  };

  // Handle rotation changes - updates plane.normal and plane.u
  const handleRotationChange = () => {
    if (!rotationControlsAnchorRef.current || !isRotatingRef.current) return;
    if (!initialRotationRef.current || !initialNormalRef.current) return;

    // Get current rotation from the anchor group
    const currentRotation = rotationControlsAnchorRef.current.rotation;

    // Calculate delta rotation (current - initial)
    const deltaRotation = new THREE.Euler();
    deltaRotation.set(
      currentRotation.x - initialRotationRef.current.x,
      currentRotation.y - initialRotationRef.current.y,
      currentRotation.z - initialRotationRef.current.z
    );

    // Convert delta rotation to rotation matrix
    const deltaRotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
      deltaRotation
    );

    // Apply delta rotation to the initial vectors
    const newNormal = initialNormalRef.current
      .clone()
      .applyMatrix4(deltaRotationMatrix)
      .normalize();
    const newU = initialURef.current
      ? initialURef.current
          .clone()
          .applyMatrix4(deltaRotationMatrix)
          .normalize()
      : undefined;

    // Origin remains unchanged during rotation
    const newPlane = plane3New(
      shape.plane.origin,
      [newNormal.x, newNormal.y, newNormal.z],
      newU ? [newU.x, newU.y, newU.z] : undefined
    );

    onShapeChange({
      plane: newPlane,
      polygon: shape.polygon,
    });

    // Update rotation group to match
    if (rotationGroupRef.current) {
      rotationGroupRef.current.rotation.copy(currentRotation);
    }
  };

  return (
    <group>
      {/* Translation group - positioned at plane origin in world space */}
      <group ref={translationGroupRef}>
        {/* Rotation group - contains the visual representation */}
        <group ref={rotationGroupRef}>
          {/* Visual representation of the workPlane */}
          <mesh geometry={shapeGeometry}>
            <meshStandardMaterial
              side={THREE.DoubleSide}
              color="#FFD700"
              opacity={0.3}
              transparent
            />
          </mesh>

          {/* Helpers - shown in plane's local space */}
          {showHelpers && (
            <>
              {/* Normal vector (Z-axis in local space) */}
              <arrowHelper
                args={[
                  new THREE.Vector3(0, 0, 1),
                  new THREE.Vector3(0, 0, 0),
                  1,
                  0xff0000,
                  0.1,
                  0.05,
                ]}
              />

              {/* U vector (X-axis in local space) */}
              <arrowHelper
                args={[
                  new THREE.Vector3(1, 0, 0),
                  new THREE.Vector3(0, 0, 0),
                  0.8,
                  0x0000ff,
                  0.08,
                  0.04,
                ]}
              />

              {/* Y-axis (normal × u) */}
              <arrowHelper
                args={[
                  new THREE.Vector3(0, 1, 0),
                  new THREE.Vector3(0, 0, 0),
                  0.8,
                  0x00ff00,
                  0.08,
                  0.04,
                ]}
              />
            </>
          )}
        </group>

        {/* Empty group at origin for rotation controls positioning */}
        <group ref={rotationControlsAnchorRef} position={[0, 0, 0]} />
      </group>

      {/* Transform controls for rotation - attached to empty group at origin */}
      {/* Only show when Shift is held */}
      {enabled &&
        showRotate &&
        isShiftHeld &&
        rotationControlsAnchorRef.current && (
          <TransformControls
            ref={rotateControlsRef}
            object={rotationControlsAnchorRef.current}
            mode="rotate"
            onChange={handleRotationChange}
            onMouseDown={() => {
              if (rotationControlsAnchorRef.current) {
                // Store initial state when dragging starts
                initialRotationRef.current =
                  rotationControlsAnchorRef.current.rotation.clone();
                initialNormalRef.current = new THREE.Vector3(
                  shape.plane.normal[0],
                  shape.plane.normal[1],
                  shape.plane.normal[2]
                );
                initialURef.current = shape.plane.u
                  ? new THREE.Vector3(
                      shape.plane.u[0],
                      shape.plane.u[1],
                      shape.plane.u[2]
                    )
                  : null;
              }
              isRotatingRef.current = true;
              onDraggingChange?.(true);
            }}
            onMouseUp={() => {
              isRotatingRef.current = false;
              initialRotationRef.current = null;
              initialNormalRef.current = null;
              initialURef.current = null;
              onDraggingChange?.(false);
            }}
            onPointerUp={() => {
              isRotatingRef.current = false;
              initialRotationRef.current = null;
              initialNormalRef.current = null;
              initialURef.current = null;
              onDraggingChange?.(false);
            }}
          />
        )}

      {/* Transform controls for translation - attached to translation group */}
      {/* Hide when Shift is held */}
      {enabled &&
        showTranslate &&
        !isShiftHeld &&
        translationGroupRef.current && (
          <TransformControls
            ref={translateControlsRef}
            object={translationGroupRef.current}
            mode="translate"
            onChange={handleTranslationChange}
            onMouseDown={() => {
              isTranslatingRef.current = true;
              onDraggingChange?.(true);
            }}
            onMouseUp={() => {
              isTranslatingRef.current = false;
              onDraggingChange?.(false);
            }}
            onPointerUp={() => {
              isTranslatingRef.current = false;
              onDraggingChange?.(false);
            }}
          />
        )}
    </group>
  );
}
