import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";

export const DRAG_THRESHOLD = 5;
export const SELECTION_THRESHOLD = 0.1;
export const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

export type SelectableLine = Line2 | THREE.LineSegments;

export function getSelectableLines(scene: THREE.Scene): SelectableLine[] {
  const lines: SelectableLine[] = [];
  scene.traverse((object) => {
    if (
      (object instanceof Line2 || object instanceof THREE.LineSegments) &&
      object.userData.handleHash
    ) {
      lines.push(object);
    }
  });
  return lines;
}

export function screenToPointer(
  clientX: number,
  clientY: number,
  rect: DOMRect
) {
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  };
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  rect: DOMRect,
  camera: THREE.Camera
): THREE.Vector3 | null {
  const pointer = screenToPointer(screenX, screenY, rect);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(pointer.x, pointer.y), camera);
  const intersection = new THREE.Vector3();
  return raycaster.ray.intersectPlane(GROUND_PLANE, intersection)
    ? intersection
    : null;
}

export function getWorldPathPoints(line: SelectableLine): THREE.Vector3[] {
  line.updateMatrixWorld(true);
  const pathPoints = line.userData.pathPoints as THREE.Vector3[];
  if (!pathPoints || pathPoints.length < 2) return [];
  return pathPoints.map((pt) => pt.clone().applyMatrix4(line.matrixWorld));
}

export function pointToSegmentDistance(
  point: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3
): number {
  const v = new THREE.Vector3().subVectors(p2, p1);
  const w = new THREE.Vector3().subVectors(point, p1);
  const c1 = w.dot(v);
  if (c1 <= 0) return point.distanceTo(p1);
  const c2 = v.dot(v);
  if (c2 <= c1) return point.distanceTo(p2);
  const b = c1 / c2;
  return point.distanceTo(p1.clone().add(v.multiplyScalar(b)));
}

export function findClosestPolyline(
  clickPoint: THREE.Vector3,
  lines: SelectableLine[],
  is2D: boolean,
  camera: THREE.Camera
): { line: SelectableLine; distance: number } | null {
  let closest: { line: SelectableLine; distance: number } | null = null;

  for (const line of lines) {
    const worldPathPoints = getWorldPathPoints(line);
    if (worldPathPoints.length < 2) continue;

    let minDistance = Infinity;

    if (is2D) {
      const projectedClick = new THREE.Vector3(clickPoint.x, clickPoint.y, 0);
      const projected = worldPathPoints.map(
        (pt) => new THREE.Vector3(pt.x, pt.y, 0)
      );
      for (let i = 0; i < projected.length - 1; i++) {
        minDistance = Math.min(
          minDistance,
          pointToSegmentDistance(projectedClick, projected[i], projected[i + 1])
        );
      }
    } else {
      const clickScreen = clickPoint.clone().project(camera);
      for (let i = 0; i < worldPathPoints.length - 1; i++) {
        const p1Screen = worldPathPoints[i].clone().project(camera);
        const p2Screen = worldPathPoints[i + 1].clone().project(camera);
        minDistance = Math.min(
          minDistance,
          pointToSegmentDistance(clickScreen, p1Screen, p2Screen)
        );
      }
    }

    if (
      minDistance < SELECTION_THRESHOLD &&
      (!closest || minDistance < closest.distance)
    ) {
      closest = { line, distance: minDistance };
    }
  }

  return closest;
}

export function polylineIntersectsRect(
  pathPoints: THREE.Vector3[],
  rectMin: THREE.Vector3,
  rectMax: THREE.Vector3
): boolean {
  return pathPoints.some(
    (point) =>
      point.x >= rectMin.x &&
      point.x <= rectMax.x &&
      point.y >= rectMin.y &&
      point.y <= rectMax.y
  );
}

export function findPolylinesInRect(
  rectMin: THREE.Vector3,
  rectMax: THREE.Vector3,
  lines: SelectableLine[]
): SelectableLine[] {
  return lines.filter((line) => {
    const worldPathPoints = getWorldPathPoints(line);
    return (
      worldPathPoints.length >= 2 &&
      polylineIntersectsRect(worldPathPoints, rectMin, rectMax)
    );
  });
}
