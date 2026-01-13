import * as THREE from "three";

export const DRAG_THRESHOLD = 5;

// Get intersection point with a plane
export function intersectPlane(
  raycaster: THREE.Raycaster,
  plane: THREE.Plane
): THREE.Vector3 | null {
  const intersection = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(plane, intersection)) {
    return intersection;
  }
  return null;
}

// Create a plane from work plane or default to XY plane
export function getIntersectionPlane(
  workPlane: THREE.Object3D | undefined
): THREE.Plane {
  if (workPlane) {
    workPlane.updateMatrixWorld(true);
    const matrix = workPlane.matrixWorld;
    const worldOrigin = new THREE.Vector3().setFromMatrixPosition(matrix);
    const worldZ = new THREE.Vector3()
      .setFromMatrixColumn(matrix, 2)
      .normalize();
    const plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(worldZ, worldOrigin);
    return plane;
  }
  return new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
}

// Transform world intersection to local work plane coordinates
export function worldToLocal(
  intersection: THREE.Vector3,
  workPlane: THREE.Object3D | undefined
): { x: number; y: number } {
  if (workPlane) {
    workPlane.updateMatrixWorld(true);
    const matrix = workPlane.matrixWorld;
    const worldOrigin = new THREE.Vector3().setFromMatrixPosition(matrix);
    const worldX = new THREE.Vector3()
      .setFromMatrixColumn(matrix, 0)
      .normalize();
    const worldY = new THREE.Vector3()
      .setFromMatrixColumn(matrix, 1)
      .normalize();

    const toIntersection = intersection.clone().sub(worldOrigin);
    return {
      x: toIntersection.dot(worldX),
      y: toIntersection.dot(worldY),
    };
  }
  return { x: intersection.x, y: intersection.y };
}

// Get normalized pointer coordinates from mouse event
export function getPointerFromEvent(
  e: MouseEvent | { clientX: number; clientY: number },
  domElement: HTMLCanvasElement
): { x: number; y: number } {
  const rect = domElement.getBoundingClientRect();
  const clientX = e.clientX;
  const clientY = e.clientY;
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  };
}

// Find closest segment to a point and return insertion info
export function findClosestSegment(
  point: { x: number; y: number },
  polylineCoords: number[]
): { segmentIndex: number; t: number; distance: number } {
  const vertexCount = Math.floor(polylineCoords.length / 2);
  let bestSegmentIndex = 0;
  let bestDistance = Infinity;
  let bestT = 0;

  for (let i = 0; i < vertexCount - 1; i++) {
    const x1 = polylineCoords[i * 2];
    const y1 = polylineCoords[i * 2 + 1];
    const x2 = polylineCoords[(i + 1) * 2];
    const y2 = polylineCoords[(i + 1) * 2 + 1];

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    let t = 0;
    if (lengthSq > 0) {
      t = Math.max(
        0,
        Math.min(1, ((point.x - x1) * dx + (point.y - y1) * dy) / lengthSq)
      );
    }

    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    const dist = Math.sqrt(
      (point.x - closestX) ** 2 + (point.y - closestY) ** 2
    );

    if (dist < bestDistance) {
      bestDistance = dist;
      bestSegmentIndex = i;
      bestT = t;
    }
  }

  return { segmentIndex: bestSegmentIndex, t: bestT, distance: bestDistance };
}

// Project vertex to screen coordinates
export function vertexToScreen(
  x: number,
  y: number,
  workPlane: THREE.Object3D | undefined,
  camera: THREE.Camera,
  domElement: HTMLCanvasElement
): { x: number; y: number } {
  let worldPos: THREE.Vector3;
  if (workPlane) {
    workPlane.updateMatrixWorld(true);
    worldPos = new THREE.Vector3(x, y, 0).applyMatrix4(workPlane.matrixWorld);
  } else {
    worldPos = new THREE.Vector3(x, y, 0);
  }

  const screenPos = worldPos.clone().project(camera);
  const rect = domElement.getBoundingClientRect();
  return {
    x: ((screenPos.x + 1) / 2) * rect.width + rect.left,
    y: ((-screenPos.y + 1) / 2) * rect.height + rect.top,
  };
}

// Check if a point is within a rectangle
export function isPointInRect(
  point: { x: number; y: number },
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): boolean {
  return (
    point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
  );
}
