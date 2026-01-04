import * as THREE from "three";
import { Face, Plane3, Polygon, Polyline2, Vec3 } from "../geom/geomTypes";
import {
  computeDefaultU,
  vec3Cross,
  vec3Length,
  vec3Normalize,
} from "../geom/vec3";
import { Doc } from "../state/doc";

export type WorkPlane = THREE.Group & {
  shape: THREE.Shape;
};

function vec3GeomToThree(vec: Vec3): Vec3 {
  return [vec[0], vec[1], vec[2]];
}

function polygonToShape(polygon: Polygon): THREE.Shape {
  const shape = new THREE.Shape();
  const outer = polygon[0];

  // Build outer boundary
  shape.moveTo(outer[0], outer[1]);
  for (let i = 2; i < outer.length; i += 2) {
    shape.lineTo(outer[i], outer[i + 1]);
  }

  // Add holes
  for (let h = 1; h < polygon.length; h++) {
    const hole = polygon[h];
    const holePath = new THREE.Path();
    holePath.moveTo(hole[0], hole[1]);
    for (let i = 2; i < hole.length; i += 2) {
      holePath.lineTo(hole[i], hole[i + 1]);
    }
    shape.holes.push(holePath);
  }

  return shape;
}

export function plane3ToWorkPlane(plane: Plane3): THREE.Group {
  const normalGeom = vec3Normalize(plane.normal);
  const normalThree = new THREE.Vector3(
    normalGeom[0],
    normalGeom[1],
    normalGeom[2]
  );

  let uGeom: Vec3;
  if (plane.u) {
    uGeom = vec3Normalize(plane.u);
    // Ensure u is orthogonal to normal by removing the component along normal
    const normalComponent =
      uGeom[0] * normalGeom[0] +
      uGeom[1] * normalGeom[1] +
      uGeom[2] * normalGeom[2];
    uGeom = [
      uGeom[0] - normalGeom[0] * normalComponent,
      uGeom[1] - normalGeom[1] * normalComponent,
      uGeom[2] - normalGeom[2] * normalComponent,
    ];
    const uLen = vec3Length(uGeom);
    if (uLen < 0.001) {
      uGeom = computeDefaultU(normalGeom);
    } else {
      uGeom = vec3Normalize(uGeom);
    }
  } else {
    uGeom = computeDefaultU(normalGeom);
  }

  const vGeom = vec3Normalize(vec3Cross(normalGeom, uGeom));

  const uThree = new THREE.Vector3(uGeom[0], uGeom[1], uGeom[2]);
  const vThree = new THREE.Vector3(vGeom[0], vGeom[1], vGeom[2]);

  const rotationMatrix = new THREE.Matrix4();
  rotationMatrix.makeBasis(uThree, vThree, normalThree);

  const workPlane = new THREE.Group();
  workPlane.position.set(plane.origin[0], plane.origin[1], plane.origin[2]);
  const rotation = new THREE.Euler().setFromRotationMatrix(rotationMatrix);
  workPlane.rotation.copy(rotation);
  workPlane.updateMatrixWorld(true);

  return workPlane;
}

export function faceToThree(face: Face): WorkPlane {
  const { plane, polygon } = face;
  const workPlane = plane3ToWorkPlane(plane);
  const shape = polygonToShape(polygon);
  (workPlane as WorkPlane).shape = shape;

  return workPlane as WorkPlane;
}

export function polyline2ToPath(polyline: Polyline2): THREE.Path {
  const path = new THREE.Path();
  if (polyline.length < 2) {
    return path;
  }
  path.moveTo(polyline[0], polyline[1]);
  for (let i = 2; i < polyline.length; i += 2) {
    path.lineTo(polyline[i], polyline[i + 1]);
  }
  return path;
}

function polyline2ToWorldVertices(
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
      // Transform to world space using work plane's matrix
      workPlane.updateMatrixWorld(true);
      localPoint.applyMatrix4(workPlane.matrixWorld);
    }

    vertices.push(localPoint);
  }

  return vertices;
}

export function loftToThree(
  vertices1: THREE.Vector3[],
  vertices2: THREE.Vector3[]
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  const maxCount = Math.max(vertices1.length, vertices2.length);

  // Get the last vertex index for each polyline
  const lastIdx1 = vertices1.length > 0 ? vertices1.length - 1 : 0;
  const lastIdx2 = vertices2.length > 0 ? vertices2.length - 1 : 0;

  let vertexIndex = 0;
  for (let i = 0; i < maxCount; i++) {
    // Determine which vertex indices to use
    const idx1 = Math.min(i, lastIdx1);
    const idx2 = Math.min(i, lastIdx2);

    const v1 = vertices1[idx1];
    const v2 = vertices2[idx2];

    // Add line segment vertices (world space 3D positions)
    positions.push(v1.x, v1.y, v1.z);
    positions.push(v2.x, v2.y, v2.z);

    // Add indices for line segment (connecting the two vertices)
    indices.push(vertexIndex, vertexIndex + 1);
    vertexIndex += 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setIndex(indices);

  return geometry;
}

export function renderDoc(doc: Doc): {
  workPlanes: Array<{ workPlane: THREE.Group; id: string }>;
  polylines: Array<{ path: THREE.Path; id: string; workPlaneId?: string }>;
  lofts: Array<{ geometry: THREE.BufferGeometry; id: string }>;
} {
  const workPlanes: Array<{ workPlane: THREE.Group; id: string }> = [];
  const polylines: Array<{
    path: THREE.Path;
    id: string;
    workPlaneId?: string;
  }> = [];
  const lofts: Array<{ geometry: THREE.BufferGeometry; id: string }> = [];

  for (const [id, workPlaneEntity] of Object.entries(doc.workPlanes)) {
    const workPlane = plane3ToWorkPlane(workPlaneEntity.plane3);
    workPlanes.push({ workPlane, id });
  }

  for (const [id, polylineEntity] of Object.entries(doc.polylines)) {
    const path = polyline2ToPath(polylineEntity.polyline);
    polylines.push({ path, id, workPlaneId: polylineEntity.workPlaneId });
  }

  for (const [id, loftEntity] of Object.entries(doc.lofts)) {
    const polyline1Entity = doc.polylines[loftEntity.polyline1];
    const polyline2Entity = doc.polylines[loftEntity.polyline2];
    if (polyline1Entity && polyline2Entity) {
      // Get work planes for transformation
      const workPlane1 = polyline1Entity.workPlaneId
        ? workPlanes.find((wp) => wp.id === polyline1Entity.workPlaneId)?.workPlane
        : undefined;
      const workPlane2 = polyline2Entity.workPlaneId
        ? workPlanes.find((wp) => wp.id === polyline2Entity.workPlaneId)?.workPlane
        : undefined;

      // Transform polyline vertices to world space
      const vertices1 = polyline2ToWorldVertices(
        polyline1Entity.polyline,
        workPlane1
      );
      const vertices2 = polyline2ToWorldVertices(
        polyline2Entity.polyline,
        workPlane2
      );

      const geometry = loftToThree(vertices1, vertices2);
      lofts.push({ geometry, id });
    }
  }

  return { workPlanes, polylines, lofts };
}
