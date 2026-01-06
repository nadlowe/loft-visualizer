import * as THREE from "three";
import { EntityHandle, hashToHandle } from "../entity/handleTypes";

export function assignHandleHash(
  object: THREE.Object3D,
  handle: EntityHandle
): void {
  object.userData.entityHandle = handle;
}

export function getHandle(object: THREE.Object3D): EntityHandle | undefined {
  return hashToHandle(object.userData.handleHash as string);
}
