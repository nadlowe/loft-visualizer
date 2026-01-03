import * as THREE from "three";
import { Vec3, Polygon, Plane3, Face, Polyline2 } from "../geom/geomTypes";
import { plane3New } from "../geom/plane3";
import { vec3Normalize } from "../geom/vec3";

/**
 * Converts a workPlane and shapeGeometry back to a Face.
 *
 * This is the inverse of faceToThree - it reconstructs the Face (persisted storage form)
 * from the THREE.js workPlane entity and shapeGeometry.
 *
 * @param workPlane - The workPlane entity containing plane, matrix, matrixInverse, and position
 * @param shapeGeometry - The THREE.BufferGeometry representing the shape
 * @returns A Face with the reconstructed Plane3 and Polygon
 */
export function threeToFace(
  workPlane: {
    plane: THREE.Plane;
    matrix: THREE.Matrix4;
    matrixInverse: THREE.Matrix4;
    position: [number, number, number];
  },
  shapeGeometry: THREE.BufferGeometry
): Face {
  // Extract Plane3 from workPlane
  const plane = workPlaneToPlane3(workPlane);

  // Extract Polygon from shapeGeometry
  const polygon = shapeGeometryToPolygon(shapeGeometry, workPlane.matrixInverse);

  return {
    plane,
    polygon,
  };
}

/**
 * Converts a workPlane back to a Plane3.
 *
 * Extracts the origin, normal, and u vector from the workPlane's matrix.
 */
function workPlaneToPlane3(workPlane: {
  plane: THREE.Plane;
  matrix: THREE.Matrix4;
  matrixInverse: THREE.Matrix4;
  position: [number, number, number];
}): Plane3 {
  // Origin comes from workPlane position
  const origin: Vec3 = [
    workPlane.position[0],
    workPlane.position[1],
    workPlane.position[2],
  ];

  // Extract basis vectors from the matrix
  // The matrix columns are: [u, v, normal, origin]
  const matrix = workPlane.matrix;
  const uThree = new THREE.Vector3();
  const vThree = new THREE.Vector3();
  const normalThree = new THREE.Vector3();

  // Extract the basis vectors from the matrix
  // Column 0: u (X-axis in local space)
  uThree.setFromMatrixColumn(matrix, 0);
  // Column 1: v (Y-axis in local space)
  vThree.setFromMatrixColumn(matrix, 1);
  // Column 2: normal (Z-axis in local space)
  normalThree.setFromMatrixColumn(matrix, 2);

  // Convert to geom Vec3 format
  const normal: Vec3 = [
    normalThree.x,
    normalThree.y,
    normalThree.z,
  ];

  const u: Vec3 = [
    uThree.x,
    uThree.y,
    uThree.z,
  ];

  // Normalize to ensure they're unit vectors
  const normalizedNormal = vec3Normalize(normal);
  const normalizedU = vec3Normalize(u);

  return plane3New(origin, normalizedNormal, normalizedU);
}

/**
 * Converts a THREE.BufferGeometry back to a Polygon.
 *
 * Transforms the 3D vertices back to 2D plane space using the inverse matrix,
 * then converts to Polygon format (array of polylines).
 */
function shapeGeometryToPolygon(
  shapeGeometry: THREE.BufferGeometry,
  matrixInverse: THREE.Matrix4
): Polygon {
  // Get position attribute from geometry
  const positions = shapeGeometry.attributes.position;
  if (!positions) {
    throw new Error("Geometry has no position attribute");
  }

  // Clone geometry to avoid modifying the original
  const clonedGeometry = shapeGeometry.clone();
  
  // Transform vertices back to 2D plane space (remove rotation, keep at origin)
  // First, we need to apply the inverse matrix to get back to local 2D space
  const rotationMatrixInverse = matrixInverse.clone();
  rotationMatrixInverse.setPosition(0, 0, 0); // Remove translation component
  
  clonedGeometry.applyMatrix4(rotationMatrixInverse);

  // Get the transformed positions
  const transformedPositions = clonedGeometry.attributes.position;
  const vertexCount = transformedPositions.count;

  // Extract vertices and convert to 2D (x, y) coordinates
  // The geometry should now be in the plane's local XY space
  const vertices: number[] = [];
  for (let i = 0; i < vertexCount; i++) {
    const x = transformedPositions.getX(i);
    const y = transformedPositions.getY(i);
    // z should be approximately 0 (or very close) since we're in the plane's local space
    vertices.push(x, y);
  }

  // For now, treat all vertices as a single outer boundary
  // In a more sophisticated implementation, we'd need to detect holes
  // by analyzing the geometry's face indices or using the original shape's holes
  const outer: Polyline2 = vertices;

  // Close the polyline if not already closed
  if (outer.length >= 4) {
    const firstX = outer[0];
    const firstY = outer[1];
    const lastX = outer[outer.length - 2];
    const lastY = outer[outer.length - 1];
    
    // If not closed, add the first point at the end
    const tolerance = 0.001;
    if (
      Math.abs(firstX - lastX) > tolerance ||
      Math.abs(firstY - lastY) > tolerance
    ) {
      outer.push(firstX, firstY);
    }
  }

  // Return polygon with outer boundary
  // Note: This doesn't reconstruct holes - they would need to be preserved
  // from the original Face or detected from the geometry
  return [outer];
}

/**
 * Alternative: Convert from workPlane and shapeGeometry with preserved hole information.
 * This version attempts to preserve the structure better by working with the shape directly.
 */
export function threeToFaceFromShape(
  workPlane: {
    plane: THREE.Plane;
    matrix: THREE.Matrix4;
    matrixInverse: THREE.Matrix4;
    position: [number, number, number];
  },
  shapeGeometry: THREE.BufferGeometry,
  originalPolygon?: Polygon // Optional: preserve hole structure from original
): Face {
  const plane = workPlaneToPlane3(workPlane);
  
  // If we have the original polygon structure, we can preserve it
  // and just update the plane
  if (originalPolygon) {
    return {
      plane,
      polygon: originalPolygon,
    };
  }

  // Otherwise, extract polygon from geometry
  const polygon = shapeGeometryToPolygon(shapeGeometry, workPlane.matrixInverse);
  
  return {
    plane,
    polygon,
  };
}
