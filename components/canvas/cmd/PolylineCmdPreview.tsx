"use client";

import { Vec2 } from "@/lib/geom/geomTypes";
import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

interface PreviewPolylineProps {
  vertices: Vec2[];
  hoverPosition: THREE.Vector3 | null;
  closeLoop: boolean;
}

export function PolylineCmdPreview({
  vertices,
  hoverPosition,
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
      color: 0xffffff,
      linewidth: 1.5,
      resolution: new THREE.Vector2(size.width, size.height),
    });

    return new Line2(geometry, material);
  }, [vertices, hoverPosition, size.width, size.height]);

  // Dashed line from hover position back to first vertex (when closeLoop enabled)
  const closeLine = useMemo(() => {
    if (!closeLoop || !hoverPosition || vertices.length < 3) {
      return null;
    }

    const firstVertex = vertices[0];
    const positions = [
      hoverPosition.x,
      hoverPosition.y,
      0,
      firstVertex[0],
      firstVertex[1],
      0,
    ];

    const geometry = new LineGeometry();
    geometry.setPositions(positions);

    const material = new LineMaterial({
      color: 0xffffff,
      linewidth: 1.5,
      resolution: new THREE.Vector2(size.width, size.height),
      dashed: true,
      dashSize: 0.15,
      gapSize: 0.1,
    });

    const line = new Line2(geometry, material);
    line.computeLineDistances();
    return line;
  }, [closeLoop, hoverPosition, vertices, size.width, size.height]);

  if (!mainLine) {
    return null;
  }

  return (
    <>
      <primitive object={mainLine} />
      {closeLine && <primitive object={closeLine} />}
    </>
  );
}
