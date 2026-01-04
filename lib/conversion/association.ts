import * as THREE from "three";
import { EntityHandle } from "../util/handleTypes";

export function assignHandle(
  object: THREE.Object3D,
  handle: EntityHandle
): void {
  object.userData.entityHandle = handle;
}

export function getHandle(object: THREE.Object3D): EntityHandle | undefined {
  return object.userData.entityHandle as EntityHandle | undefined;
}
