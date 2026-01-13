import * as THREE from "three";
import { Plane3, Vec3 } from "../geom/geomTypes";
import { plane3New } from "../geom/plane3";
import { vec3Normalize } from "../geom/vec3";

export function workPlaneToPlane3(workPlane: THREE.Group): Plane3 {
  workPlane.updateMatrixWorld(true);

  const origin: Vec3 = [
    workPlane.position.x,
    workPlane.position.y,
    workPlane.position.z,
  ];

  const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
    workPlane.rotation
  );

  const uThree = new THREE.Vector3();
  const vThree = new THREE.Vector3();
  const normalThree = new THREE.Vector3();

  uThree.setFromMatrixColumn(rotationMatrix, 0);
  vThree.setFromMatrixColumn(rotationMatrix, 1);
  normalThree.setFromMatrixColumn(rotationMatrix, 2);

  const normal: Vec3 = [normalThree.x, normalThree.y, normalThree.z];
  const u: Vec3 = [uThree.x, uThree.y, uThree.z];

  const normalizedNormal = vec3Normalize(normal);
  const normalizedU = vec3Normalize(u);

  return plane3New(origin, normalizedNormal, normalizedU);
}
