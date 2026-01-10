import { Plane3, Vec3 } from "@/lib/geom/geomTypes";
import {
  computeDefaultU,
  vec3Cross,
  vec3Length,
  vec3Normalize,
} from "@/lib/geom/vec3";
import { Doc } from "@/lib/state/doc";
import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────
// 1. PERSISTED DATA TYPES
//    Input: WorkPlaneEntity with Plane3
// ─────────────────────────────────────────────────────────────────

export type WorkPlane = THREE.Group & {
  shape: THREE.Shape;
};

// ─────────────────────────────────────────────────────────────────
// 2. MANIPULATION GEOMETRY
//    Intermediate: THREE.Group with position/rotation
// ─────────────────────────────────────────────────────────────────

function plane3ToWorkPlane(plane: Plane3): THREE.Group {
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

// ─────────────────────────────────────────────────────────────────
// 3. RENDERABLE GEOMETRY
//    Output: THREE.Group for scene graph
// ─────────────────────────────────────────────────────────────────

export function workPlaneTableToRendered(
  workPlanes: Doc["workPlanes"]
): Array<{ workPlane: THREE.Group; id: string }> {
  const result: Array<{ workPlane: THREE.Group; id: string }> = [];
  for (const [id, workPlaneEntity] of Object.entries(workPlanes)) {
    const workPlane = plane3ToWorkPlane(workPlaneEntity.plane3);
    result.push({ workPlane, id });
  }
  return result;
}
