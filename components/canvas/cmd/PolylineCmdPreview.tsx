"use client";

import { colors } from "@/components/colors";
import { Vec2 } from "@/lib/geom/geomTypes";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

interface PreviewPolylineProps {
  vertices: Vec2[];
  hoverPosition: THREE.Vector3 | null;
  snapPosition: THREE.Vector3 | null;
  closeLoop: boolean;
}

export function PolylineCmdPreview({
  vertices,
  hoverPosition,
  snapPosition,
  closeLoop,
}: PreviewPolylineProps) {
  const { size } = useThree();

  // Main polyline from vertices to hover position
  const mainLine = useMemo(() => {
    const points: THREE.Vector3[] = [];
    if (vertices.length > 0) {
      vertices.forEach((v) => {
        points.push(new THREE.Vector3(v[0], v[1], 0));
      });
    }
    if (hoverPosition) {
      points.push(hoverPosition.clone().setZ(0));
    }

    if (points.length < 2) {
      return null;
    }

    const positions: number[] = [];
    points.forEach((p) => {
      positions.push(p.x, p.y, p.z);
    });

    const geometry = new LineGeometry();
    geometry.setPositions(positions);

    const material = new LineMaterial({
      color: colors.canvas.white,
      linewidth: 1.5,
      resolution: new THREE.Vector2(size.width, size.height),
    });

    return new Line2(geometry, material);
  }, [vertices, hoverPosition, size.width, size.height]);

  // Dashed line from hover position back to first vertex (when closeLoop enabled)
  // Created once, updated in useFrame
  const closeLine = useMemo(() => {
    const geometry = new LineGeometry();
    geometry.setPositions([0, 0, 0, 1, 0, 0]); // Placeholder, updated in useFrame

    const material = new LineMaterial({
      color: colors.canvas.white,
      linewidth: 1.5,
      resolution: new THREE.Vector2(size.width, size.height),
      dashed: true,
      dashSize: 8,
      gapSize: 4,
    });

    const line = new Line2(geometry, material);
    line.visible = false;
    return line;
  }, [size.width, size.height]);

  // Snap indicator (plus/crosshair) - created once, position/scale updated in useFrame
  const snapIndicator = useMemo(() => {
    const group = new THREE.Group();
    const material = new THREE.LineBasicMaterial({ color: colors.canvas.white });

    // Create horizontal line (unit size, will be scaled in useFrame)
    const hGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(1, 0, 0),
    ]);
    const hLine = new THREE.Line(hGeometry, material);
    group.add(hLine);

    // Create vertical line
    const vGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 1, 0),
    ]);
    const vLine = new THREE.Line(vGeometry, material);
    group.add(vLine);

    group.visible = false;
    return group;
  }, []);

  // Update dashed line, snap indicator each frame
  useFrame(({ camera, size: frameSize }) => {
    // Calculate world units per pixel for proper screen-space scaling
    let worldUnitsPerPixel: number;
    if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
      const orthoCamera = camera as THREE.OrthographicCamera;
      const visibleWidth =
        (orthoCamera.right - orthoCamera.left) / orthoCamera.zoom;
      worldUnitsPerPixel = visibleWidth / frameSize.width;
    } else {
      // For perspective camera, use distance to target for approximate scaling
      const distance = camera.position.length();
      const fov = (camera as THREE.PerspectiveCamera).fov || 75;
      const vFov = (fov * Math.PI) / 180;
      const visibleHeight = 2 * Math.tan(vFov / 2) * distance;
      worldUnitsPerPixel = visibleHeight / frameSize.height;
    }

    // Update close loop dashed line
    if (closeLoop && hoverPosition && vertices.length >= 2) {
      const firstVertex = vertices[0];
      const positions = [
        hoverPosition.x,
        hoverPosition.y,
        0,
        firstVertex[0],
        firstVertex[1],
        0,
      ];
      closeLine.geometry.setPositions(positions);
      closeLine.computeLineDistances();
      closeLine.visible = true;

      // Update dash size for screen-space scaling
      const material = closeLine.material as LineMaterial;
      material.dashSize = 8 * worldUnitsPerPixel;
      material.gapSize = 4 * worldUnitsPerPixel;
    } else {
      closeLine.visible = false;
    }

    // Update snap indicator position, scale, and visibility
    if (
      snapPosition &&
      worldUnitsPerPixel > 0 &&
      isFinite(worldUnitsPerPixel)
    ) {
      snapIndicator.visible = true;
      // Set position with small z offset to render above ground plane
      snapIndicator.position.set(snapPosition.x, snapPosition.y, 0.01);
      // ~10 pixel crosshair (scale from -1 to 1 geometry = 2 units, so *0.5 for radius)
      const indicatorSize = 10 * worldUnitsPerPixel;
      snapIndicator.scale.set(indicatorSize, indicatorSize, 1);
    } else {
      snapIndicator.visible = false;
    }
  });

  return (
    <>
      {mainLine && <primitive object={mainLine} />}
      <primitive object={closeLine} />
      <primitive object={snapIndicator} />
    </>
  );
}
