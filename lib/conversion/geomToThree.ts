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

export function renderDoc(doc: Doc): {
  workPlanes: Array<{ workPlane: THREE.Group; id: string }>;
  polylines: Array<{ path: THREE.Path; id: string; workPlaneId?: string }>;
} {
  const workPlanes: Array<{ workPlane: THREE.Group; id: string }> = [];
  const polylines: Array<{
    path: THREE.Path;
    id: string;
    workPlaneId?: string;
  }> = [];

  for (const [id, workPlaneEntity] of Object.entries(doc.workPlanes)) {
    const workPlane = plane3ToWorkPlane(workPlaneEntity.plane3);
    workPlanes.push({ workPlane, id });
  }

  for (const [id, polylineEntity] of Object.entries(doc.polylines)) {
    const path = polyline2ToPath(polylineEntity.polyline);
    polylines.push({ path, id, workPlaneId: polylineEntity.workPlaneId });
  }

  return { workPlanes, polylines };
}
