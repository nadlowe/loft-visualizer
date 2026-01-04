"use client";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export function CameraController({
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
          -40000,
          40000
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
          40000
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
