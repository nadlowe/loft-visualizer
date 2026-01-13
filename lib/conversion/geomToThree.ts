import * as THREE from "three";
import { Section } from "../geom/section";

export function sectionsToThree(sections: Section[]): THREE.Vector3[][] {
  return sections.map((section) => [
    new THREE.Vector3(...section[0]),
    new THREE.Vector3(...section[1]),
  ]);
}
