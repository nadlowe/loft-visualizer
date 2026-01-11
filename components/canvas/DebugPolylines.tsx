"use client";
import { useDebugPoints, useDebugPolylines } from "@/lib/debug/debugGeom";
import { Vec3 } from "@/lib/geom/geomTypes";
import { Line } from "@react-three/drei";

export function DebugPolylines() {
  const polylines = useDebugPolylines();
  const points = useDebugPoints();

  return (
    <>
      {polylines.map(({ id, polyline, color }) => {
        const pts: Vec3[] = [];
        for (let i = 0; i < polyline.length / 3; i++) {
          pts.push([polyline[i * 3], polyline[i * 3 + 1], polyline[i * 3 + 2]]);
        }
        return <Line key={id} points={pts} color={color} lineWidth={3} />;
      })}
      {points.map(({ id, point, color, size }) => (
        <mesh key={id} position={point}>
          <sphereGeometry args={[size, 16, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </>
  );
}
