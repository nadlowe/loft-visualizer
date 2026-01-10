"use client";
import { colors } from "@/components/colors";
import { WorkPlane } from "@/lib/canvas/render/renderWorkPlane";
import { TransformControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface WorkPlaneWidgetProps {
  workPlane: WorkPlane;
  onWorkPlaneChange: (workPlane: WorkPlane) => void;
  onWorkPlaneChangeTemporary?: (workPlane: WorkPlane) => void;
  onWorkPlaneChangeFinal?: (workPlane: WorkPlane) => void;
  onDraggingChange?: (isDragging: boolean) => void;
  onDragStart?: () => void;
  enabled?: boolean;
  showHelpers?: boolean;
  showTranslate?: boolean;
  showRotate?: boolean;
}

function extractNormalAndU(workPlane: WorkPlane): {
  normal: THREE.Vector3;
  u: THREE.Vector3 | null;
} {
  workPlane.updateMatrixWorld(true);
  const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
    workPlane.rotation
  );

  const uThree = new THREE.Vector3();
  const normalThree = new THREE.Vector3();

  // Extract basis vectors from rotation matrix
  uThree.setFromMatrixColumn(rotationMatrix, 0); // X-axis (u)
  normalThree.setFromMatrixColumn(rotationMatrix, 2); // Z-axis (normal)

  return {
    normal: normalThree.normalize(),
    u: uThree.normalize(),
  };
}

export function WorkPlaneWidget({
  workPlane,
  onWorkPlaneChange,
  onWorkPlaneChangeTemporary,
  onWorkPlaneChangeFinal,
  onDraggingChange,
  onDragStart,
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

  // Initialize translation group position from workPlane
  useEffect(() => {
    if (!translationGroupRef.current) return;
    // Don't update if actively dragging
    if (isTranslatingRef.current) return;
    translationGroupRef.current.position.copy(workPlane.position);
    // Ensure rotation group stays at origin relative to translation group
    if (rotationGroupRef.current) {
      rotationGroupRef.current.position.set(0, 0, 0);
    }
  }, [workPlane.position]);

  // Initialize rotation group orientation from workPlane
  useEffect(() => {
    if (!rotationGroupRef.current || !rotationControlsAnchorRef.current) return;
    // Don't update if actively dragging
    if (isRotatingRef.current || isTranslatingRef.current) return;
    // Ensure rotation group and anchor are at origin relative to translation group
    rotationGroupRef.current.position.set(0, 0, 0);
    rotationControlsAnchorRef.current.position.set(0, 0, 0);
    // Copy rotation from workPlane
    rotationControlsAnchorRef.current.rotation.copy(workPlane.rotation);
    rotationGroupRef.current.rotation.copy(workPlane.rotation);
  }, [workPlane.rotation]);

  // Handle translation changes - updates workPlane position
  const handleTranslationChange = () => {
    if (!translationGroupRef.current || !isTranslatingRef.current) return;

    const position = translationGroupRef.current.position;

    // Ensure rotation group stays at origin relative to translation group
    if (rotationGroupRef.current) {
      rotationGroupRef.current.position.set(0, 0, 0);
    }

    // Create updated workPlane with new position
    // Clone doesn't preserve custom properties, so we copy manually
    const updatedWorkPlane = new THREE.Group() as WorkPlane;
    updatedWorkPlane.position.copy(position);
    updatedWorkPlane.rotation.copy(workPlane.rotation);
    updatedWorkPlane.shape = workPlane.shape; // Preserve THREE.Shape (holes)

    // Use temporary update during dragging to avoid saving every frame
    if (onWorkPlaneChangeTemporary) {
      onWorkPlaneChangeTemporary(updatedWorkPlane);
    } else {
      onWorkPlaneChange(updatedWorkPlane);
    }
  };

  // Handle rotation changes - updates workPlane rotation
  const handleRotationChange = () => {
    if (!rotationControlsAnchorRef.current || !isRotatingRef.current) return;
    if (!initialRotationRef.current) return;

    // Get current rotation from the anchor group
    const currentRotation = rotationControlsAnchorRef.current.rotation;

    // Create updated workPlane with new rotation
    // Clone doesn't preserve custom properties, so we copy manually
    const updatedWorkPlane = new THREE.Group() as WorkPlane;
    updatedWorkPlane.position.copy(workPlane.position);
    updatedWorkPlane.rotation.copy(currentRotation);
    updatedWorkPlane.shape = workPlane.shape; // Preserve THREE.Shape (holes)
    updatedWorkPlane.updateMatrixWorld(true);

    // Use temporary update during dragging to avoid saving every frame
    if (onWorkPlaneChangeTemporary) {
      onWorkPlaneChangeTemporary(updatedWorkPlane);
    } else {
      onWorkPlaneChange(updatedWorkPlane);
    }

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
          {/* Visual representation of the workPlane - generate geometry from shape */}
          {workPlane.shape && (
            <mesh geometry={new THREE.ShapeGeometry(workPlane.shape)}>
              <meshStandardMaterial
                side={THREE.DoubleSide}
                color={colors.canvas.workPlane}
                opacity={0.75}
                transparent
              />
            </mesh>
          )}

          {/* Helpers - shown in plane's local space */}
          {showHelpers && (
            <>
              {/* Normal vector (Z-axis in local space) */}
              <arrowHelper
                args={[
                  new THREE.Vector3(0, 0, 1),
                  new THREE.Vector3(0, 0, 0),
                  1,
                  colors.canvas.axis.x,
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
                  colors.canvas.axis.z,
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
                  colors.canvas.axis.y,
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
      {/* space="local" keeps rotation axes relative to the plane (barrel roll about normal) */}
      {enabled &&
        showRotate &&
        isShiftHeld &&
        rotationControlsAnchorRef.current && (
          <TransformControls
            ref={rotateControlsRef}
            object={rotationControlsAnchorRef.current}
            mode="rotate"
            space="local"
            size={0.5}
            onChange={handleRotationChange}
            onMouseDown={() => {
              onDragStart?.();
              if (rotationControlsAnchorRef.current) {
                // Store initial state when dragging starts
                initialRotationRef.current =
                  rotationControlsAnchorRef.current.rotation.clone();
                // Extract normal and u from current workPlane
                const { normal, u } = extractNormalAndU(workPlane);
                initialNormalRef.current = normal;
                initialURef.current = u;
              }
              isRotatingRef.current = true;
              onDraggingChange?.(true);
            }}
            onMouseUp={() => {
              isRotatingRef.current = false;

              // Final update on mouse up (no snapshot - already saved on drag start)
              if (rotationControlsAnchorRef.current) {
                const currentRotation =
                  rotationControlsAnchorRef.current.rotation;
                const updatedWorkPlane = new THREE.Group() as WorkPlane;
                updatedWorkPlane.position.copy(workPlane.position);
                updatedWorkPlane.rotation.copy(currentRotation);
                updatedWorkPlane.shape = workPlane.shape;
                updatedWorkPlane.updateMatrixWorld(true);
                if (onWorkPlaneChangeFinal) {
                  onWorkPlaneChangeFinal(updatedWorkPlane);
                } else {
                  onWorkPlaneChange(updatedWorkPlane);
                }
              }

              initialRotationRef.current = null;
              initialNormalRef.current = null;
              initialURef.current = null;
              onDraggingChange?.(false);
            }}
            onPointerUp={() => {
              isRotatingRef.current = false;

              // Final update on pointer up (no snapshot - already saved on drag start)
              if (rotationControlsAnchorRef.current) {
                const currentRotation =
                  rotationControlsAnchorRef.current.rotation;
                const updatedWorkPlane = new THREE.Group() as WorkPlane;
                updatedWorkPlane.position.copy(workPlane.position);
                updatedWorkPlane.rotation.copy(currentRotation);
                updatedWorkPlane.shape = workPlane.shape;
                updatedWorkPlane.updateMatrixWorld(true);
                if (onWorkPlaneChangeFinal) {
                  onWorkPlaneChangeFinal(updatedWorkPlane);
                } else {
                  onWorkPlaneChange(updatedWorkPlane);
                }
              }

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
            size={0.5}
            onChange={handleTranslationChange}
            onMouseDown={() => {
              onDragStart?.();
              isTranslatingRef.current = true;
              onDraggingChange?.(true);
            }}
            onMouseUp={() => {
              isTranslatingRef.current = false;

              // Final update on mouse up (no snapshot - already saved on drag start)
              if (translationGroupRef.current) {
                const position = translationGroupRef.current.position;
                const updatedWorkPlane = new THREE.Group() as WorkPlane;
                updatedWorkPlane.position.copy(position);
                updatedWorkPlane.rotation.copy(workPlane.rotation);
                updatedWorkPlane.shape = workPlane.shape;
                if (onWorkPlaneChangeFinal) {
                  onWorkPlaneChangeFinal(updatedWorkPlane);
                } else {
                  onWorkPlaneChange(updatedWorkPlane);
                }
              }

              onDraggingChange?.(false);
            }}
            onPointerUp={() => {
              isTranslatingRef.current = false;

              // Final update on pointer up (no snapshot - already saved on drag start)
              if (translationGroupRef.current) {
                const position = translationGroupRef.current.position;
                const updatedWorkPlane = new THREE.Group() as WorkPlane;
                updatedWorkPlane.position.copy(position);
                updatedWorkPlane.rotation.copy(workPlane.rotation);
                updatedWorkPlane.shape = workPlane.shape;
                if (onWorkPlaneChangeFinal) {
                  onWorkPlaneChangeFinal(updatedWorkPlane);
                } else {
                  onWorkPlaneChange(updatedWorkPlane);
                }
              }

              onDraggingChange?.(false);
            }}
          />
        )}
    </group>
  );
}
