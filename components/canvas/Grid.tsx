"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

interface GridProps {
  /** Base cell spacing in world units. (Your "inch") */
  cellSize?: number;
  /** Section spacing in world units. (Your "foot" = 12 * cellSize) */
  sectionSize?: number;
  /** Major spacing in world units. (Your "10ft" = 120 * cellSize) */
  majorSectionSize?: number; // default 120
  /** Super-major spacing in world units. (Your "100ft" = 1200 * cellSize) */
  superSectionSize?: number; // default 1200
  /** Constant pixel width for all grid levels (independent of zoom). */
  lineWidthPx?: number; // default 1.0
  /** When a grid level's cell is smaller than this many pixels, it fades out. */
  minCellSizePixels?: number; // default 2
  /** Fade band in pixels for smooth transitions (bigger = softer). */
  fadeBandPixels?: number; // default 5
  /** Opacity multiplier for all grid levels (0..1). */
  opacity?: number; // default 0.6
  /** Grid color */
  colorGrid?: THREE.Color | string | number;
  /** Plane size (world units). If you pan very far, consider "followCamera" below. */
  planeSize?: number; // default 2000
  /**
   * If true, the plane follows the camera in XY (good for large panning ranges).
   * Keeps the grid near the camera and reduces floating-point jitter far from origin.
   */
  followCamera?: boolean;
  /**
   * Snap the follower plane to this multiple (in world units).
   * Usually set this to your largest spacing (e.g. superSectionSize) to keep movement stable.
   */
  followSnap?: number; // default superSectionSize
}

export function Grid({
  cellSize = 1,
  sectionSize = 12,
  majorSectionSize = 12,
  superSectionSize = 12,
  lineWidthPx = 1.0,
  minCellSizePixels = 2,
  fadeBandPixels = 5,
  opacity = 0.4,
  colorGrid = "#cccccc",
  planeSize = 40000,
  followCamera = false,
  followSnap,
}: GridProps) {
  const { camera, size } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);

  const shaderMaterial = useMemo(() => {
    const gridColor = new THREE.Color(colorGrid);

    return new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      uniforms: {
        // sizes
        uMinorSize: { value: cellSize },
        uSectionSize: { value: sectionSize },
        uMajorSize: { value: majorSectionSize },
        uSuperSize: { value: superSectionSize },

        // line widths in pixels (constant visual thickness)
        uMinorPxWidth: { value: lineWidthPx },
        uSectionPxWidth: { value: lineWidthPx },
        uMajorPxWidth: { value: lineWidthPx },
        uSuperPxWidth: { value: lineWidthPx },

        // fade behavior
        uMinPx: { value: minCellSizePixels },
        uFadePx: { value: fadeBandPixels },

        // per-level opacity
        uMinorOpacity: { value: opacity },
        uSectionOpacity: { value: opacity },
        uMajorOpacity: { value: opacity },
        uSuperOpacity: { value: opacity },

        uGridColor: { value: gridColor },

        // computed each frame
        uViewScale: { value: 1.0 }, // pixels per world unit at the grid plane
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform vec3  uGridColor;

        uniform float uMinorSize;
        uniform float uSectionSize;
        uniform float uMajorSize;
        uniform float uSuperSize;

        uniform float uMinorPxWidth;
        uniform float uSectionPxWidth;
        uniform float uMajorPxWidth;
        uniform float uSuperPxWidth;

        uniform float uMinPx;
        uniform float uFadePx;

        uniform float uMinorOpacity;
        uniform float uSectionOpacity;
        uniform float uMajorOpacity;
        uniform float uSuperOpacity;

        uniform float uViewScale; // pixels per world unit at the grid plane

        varying vec3 vWorldPosition;

        float fadeIn(float pxSize) {
          // Show lines when cells are reasonably sized, fade out when too small
          // 1 above uMinPx + uFadePx, 0 below uMinPx
          return smoothstep(uMinPx, uMinPx + uFadePx, pxSize);
        }

        float fadeOut(float pxSize, float startPx) {
          // 1 below startPx, 0 above startPx + uFadePx
          return 1.0 - smoothstep(startPx, startPx + uFadePx, pxSize);
        }
        
        float fadeOutSmall(float pxSize) {
          // Show lines unless cells are extremely small (< 0.5 pixels)
          // This ensures lines are visible when zoomed in
          return smoothstep(0.3, 1.0, pxSize);
        }

        float gridLine(vec2 coord, float sizeWorld, float pxWidth) {
        // Cell-space coordinate
        vec2 p = coord / sizeWorld;

        // Distance to nearest grid line in [0..0.5]
        vec2 fractP = fract(p);
        vec2 d = min(fractP, 1.0 - fractP);
        float dist = min(d.x, d.y);

        // Convert px width -> half-width in cell space
        float pxPerCell = max(sizeWorld * uViewScale, 1e-6);
        float halfWidthCell = min((pxWidth * 0.5) / pxPerCell, 0.5);

        // Antialias band in cell space
        float aa = fwidth(dist);

        // 1 at line, 0 away
        return 1.0 - smoothstep(halfWidthCell - aa, halfWidthCell + aa, dist);
        }       

        void main() {
          vec2 coord = vWorldPosition.xy;

          // Pixel size of each grid spacing
          float minorPx = uMinorSize   * uViewScale;
          float sectPx  = uSectionSize * uViewScale;
          float majorPx = uMajorSize   * uViewScale;
          float superPx = uSuperSize   * uViewScale;

          // Show lines unless they're extremely small (< 0.1 pixels)
          // This makes lines visible when zoomed in
          float minorVis = step(0.1, minorPx);
          float sectVis  = step(0.1, sectPx);
          float majorVis = step(0.1, majorPx);
          float superVis = step(0.1, superPx);

          // Cross-fade / hand-off so you don't get "too many lines"
          // Only fade out when the next level is very clearly visible (~50px per cell)
          // This allows multiple levels to be visible when zoomed in
          // Use max to ensure at least some visibility
          minorVis = max(minorVis * fadeOut(sectPx, 10.0), step(0.1, minorPx) * 0.3);
          sectVis  = max(sectVis  * fadeOut(majorPx, 10.0), step(0.1, sectPx) * 0.3);
          majorVis = max(majorVis * fadeOut(superPx, 10.0), step(0.1, majorPx) * 0.3);
          // superVis stays (or you could fade it out against an even larger level)

          // Lines (constant pixel thickness)
          float minor = gridLine(coord, uMinorSize,   uMinorPxWidth)   * minorVis * uMinorOpacity;
          float sect  = gridLine(coord, uSectionSize, uSectionPxWidth) * sectVis  * uSectionOpacity;
          float major = gridLine(coord, uMajorSize,   uMajorPxWidth)   * majorVis * uMajorOpacity;
          float sup   = gridLine(coord, uSuperSize,   uSuperPxWidth)   * superVis * uSuperOpacity;

          float alpha = max(max(minor, sect), max(major, sup));

          // Clamp alpha for safety
          alpha = clamp(alpha, 0.0, 1.0);

          gl_FragColor = vec4(uGridColor, alpha);
        }
      `,
    });
  }, [
    cellSize,
    sectionSize,
    majorSectionSize,
    superSectionSize,
    lineWidthPx,
    minCellSizePixels,
    fadeBandPixels,
    opacity,
    colorGrid,
  ]);

  const planeGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(planeSize, planeSize);
  }, [planeSize]);

  // Helper: compute pixels-per-world-unit at the grid plane (z = 0)
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndcCenter = useMemo(() => new THREE.Vector2(0, 0), []);
  const plane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), // z = 0
    []
  );

  useFrame(() => {
    const mat = meshRef.current?.material as THREE.ShaderMaterial | undefined;
    if (!mat) return;

    // Compute uViewScale (px per world unit) robustly for both ortho + perspective,
    // even when the camera tilts/orbits: sample at the intersection of the camera's
    // center ray with the z=0 plane.
    let viewScale = 1;

    if (camera instanceof THREE.OrthographicCamera) {
      const heightWorld = (camera.top - camera.bottom) / camera.zoom;
      viewScale = size.height / heightWorld;
    } else {
      // Perspective: use ray-plane intersection to get a reference depth on the grid plane
      raycaster.setFromCamera(ndcCenter, camera);
      const hitPoint = new THREE.Vector3();
      const hit = raycaster.ray.intersectPlane(plane, hitPoint);

      // If we're looking parallel to the plane and can't intersect, fall back to old heuristic
      if (!hit) {
        const distance = Math.abs(camera.position.z);
        const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
        const viewHeightWorld = 2.0 * distance * Math.tan(fov / 2.0);
        viewScale = size.height / viewHeightWorld;
      } else {
        // At the hitPoint depth, world-units-per-pixel ~= (2*z*tan(fov/2))/heightPx
        // Where z is distance along camera forward direction.
        const camToHit = hitPoint.clone().sub(camera.position);
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        const z = Math.max(camToHit.dot(forward), 1e-6);

        const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
        const viewHeightWorld = 2.0 * z * Math.tan(fov / 2.0);
        viewScale = size.height / viewHeightWorld;
      }
    }

    // Ensure viewScale is never zero or too small
    mat.uniforms.uViewScale.value = Math.max(viewScale, 0.001);

    // Optional: keep the grid centered under the camera to reduce jitter at large coordinates
    if (followCamera && meshRef.current) {
      const snap = followSnap ?? superSectionSize;

      const x = camera.position.x;
      const y = camera.position.y;

      const sx = snap > 0 ? Math.round(x / snap) * snap : x;
      const sy = snap > 0 ? Math.round(y / snap) * snap : y;

      meshRef.current.position.set(sx, sy, 0);
    }
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[0, 0, 0]}
      position={[0, 0, 0]}
      geometry={planeGeometry}
      material={shaderMaterial}
      renderOrder={-1}
    />
  );
}
