import * as THREE from "three";
import { Polyline2 } from "../geom/geomTypes";

// Number of subdivisions for loft surfaces (both along polylines and across sections)
export const LOFT_SUBDIVISIONS = 3;

export function generateLoft(
  polyline1: Polyline2,
  polyline2: Polyline2,
  workPlane1: THREE.Group | undefined,
  workPlane2: THREE.Group | undefined,
  subdivisions: number = LOFT_SUBDIVISIONS
): THREE.Vector3[][] {
  const vertices1 = polyline2ToWorldVertices(polyline1, workPlane1);
  const vertices2 = polyline2ToWorldVertices(polyline2, workPlane2);

  const subdividedVertices1 = subdivideVertices(vertices1, subdivisions);
  const subdividedVertices2 = subdivideVertices(vertices2, subdivisions);

  const sections: THREE.Vector3[][] = [];
  const maxCount = Math.max(
    subdividedVertices1.length,
    subdividedVertices2.length
  );
  const lastIdx1 =
    subdividedVertices1.length > 0 ? subdividedVertices1.length - 1 : 0;
  const lastIdx2 =
    subdividedVertices2.length > 0 ? subdividedVertices2.length - 1 : 0;

  for (let i = 0; i < maxCount; i++) {
    sections.push([
      subdividedVertices1[Math.min(i, lastIdx1)],
      subdividedVertices2[Math.min(i, lastIdx2)],
    ]);
  }

  return sections;
}

function subdivideVertices(
  vertices: THREE.Vector3[],
  subdivisions: number
): THREE.Vector3[] {
  if (vertices.length < 2 || subdivisions < 1) return vertices;

  const result: THREE.Vector3[] = [];
  for (let i = 0; i < vertices.length - 1; i++) {
    result.push(vertices[i].clone());
    const v1 = vertices[i];
    const v2 = vertices[i + 1];
    for (let j = 1; j <= subdivisions; j++) {
      const t = j / (subdivisions + 1);
      result.push(new THREE.Vector3().lerpVectors(v1, v2, t));
    }
  }
  result.push(vertices[vertices.length - 1].clone());
  return result;
}

export function polyline2ToWorldVertices(
  polyline: Polyline2,
  workPlane?: THREE.Group
): THREE.Vector3[] {
  const vertices: THREE.Vector3[] = [];
  const count = Math.floor(polyline.length / 2);

  for (let i = 0; i < count; i++) {
    const x = polyline[i * 2];
    const y = polyline[i * 2 + 1];
    const localPoint = new THREE.Vector3(x, y, 0);

    if (workPlane) {
      workPlane.updateMatrixWorld(true);
      localPoint.applyMatrix4(workPlane.matrixWorld);
    }

    vertices.push(localPoint);
  }

  return vertices;
}
