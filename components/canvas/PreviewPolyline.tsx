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
}

export function PreviewPolyline({
  vertices,
  hoverPosition,
}: PreviewPolylineProps) {
  const { size } = useThree();
  const line = useMemo(() => {
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

  if (!line) {
    return null;
  }

  return <primitive object={line} />;
}
