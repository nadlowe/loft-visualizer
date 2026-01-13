import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";

export const DRAG_THRESHOLD = 5;
export const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

type SelectableLine = Line2 | THREE.LineSegments;

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

function getWorldPathPoints(line: SelectableLine): THREE.Vector3[] {
  line.updateMatrixWorld(true);
  const pathPoints = line.userData.pathPoints as THREE.Vector3[];
  if (!pathPoints || pathPoints.length < 2) return [];
  return pathPoints.map((pt) => pt.clone().applyMatrix4(line.matrixWorld));
}

function pointToSegmentDistance(
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
  camera: THREE.Camera,
  canvasWidth: number,
  canvasHeight: number
): { line: SelectableLine; distance: number } | null {
  let closest: { line: SelectableLine; distance: number } | null = null;

  // Use a fixed pixel threshold
  const selectionThresholdPixels = 10;

  for (const line of lines) {
    const worldPathPoints = getWorldPathPoints(line);
    if (worldPathPoints.length < 2) continue;

    let minPixelDistance = Infinity;

    // Helper to convert a world point to pixel coordinates
    const toPixel = (pt: THREE.Vector3) => {
      const projected = pt.clone().project(camera);
      return new THREE.Vector3(
        ((projected.x + 1) * canvasWidth) / 2,
        ((1 - projected.y) * canvasHeight) / 2,
        0
      );
    };

    const clickPixel = toPixel(clickPoint);

    for (let i = 0; i < worldPathPoints.length - 1; i++) {
      const p1Pixel = toPixel(worldPathPoints[i]);
      const p2Pixel = toPixel(worldPathPoints[i + 1]);

      const dist = pointToSegmentDistance(clickPixel, p1Pixel, p2Pixel);
      minPixelDistance = Math.min(minPixelDistance, dist);
    }

    if (
      minPixelDistance < selectionThresholdPixels &&
      (!closest || minPixelDistance < closest.distance)
    ) {
      closest = { line, distance: minPixelDistance };
    }
  }

  return closest;
}

function polylineIntersectsRect(
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
