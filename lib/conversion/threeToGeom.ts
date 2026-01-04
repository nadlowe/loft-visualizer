import * as THREE from "three";
import { Vec3, Polygon, Plane3, Face, Polyline2 } from "../geom/geomTypes";
import { plane3New } from "../geom/plane3";
import { vec3Normalize } from "../geom/vec3";
import { WorkPlane } from "./geomToThree";

/**
 * Converts a THREE.Shape back to a Polygon.
 *
 * Extracts the outer boundary and holes from the Shape using getPoints().
 */
function shapeToPolygon(shape: THREE.Shape): Polygon {
  const polygon: Polygon = [];

  // Extract outer boundary points from the shape
  // Use getPoints() to get all points including from curves
  const outerPoints = shape.getPoints();
  const outer: Polyline2 = [];
  outerPoints.forEach((point) => {
    outer.push(point.x, point.y);
  });

  // Close the polyline if not already closed
  if (outer.length >= 4) {
    const firstX = outer[0];
    const firstY = outer[1];
    const lastX = outer[outer.length - 2];
    const lastY = outer[outer.length - 1];

    const tolerance = 0.001;
    if (
      Math.abs(firstX - lastX) > tolerance ||
      Math.abs(firstY - lastY) > tolerance
    ) {
      outer.push(firstX, firstY);
    }
  }

  polygon.push(outer);

  // Extract holes from shape.holes
  shape.holes.forEach((hole) => {
    const holePoints = hole.getPoints();
    const holePolyline: Polyline2 = [];
    holePoints.forEach((point) => {
      holePolyline.push(point.x, point.y);
    });

    // Close the hole polyline if not already closed
    if (holePolyline.length >= 4) {
      const firstX = holePolyline[0];
      const firstY = holePolyline[1];
      const lastX = holePolyline[holePolyline.length - 2];
      const lastY = holePolyline[holePolyline.length - 1];

      const tolerance = 0.001;
      if (
        Math.abs(firstX - lastX) > tolerance ||
        Math.abs(firstY - lastY) > tolerance
      ) {
        holePolyline.push(firstX, firstY);
      }
    }

    polygon.push(holePolyline);
  });

  return polygon;
}

/**
 * Converts a workPlane Group back to a Face.
 *
 * This is the inverse of faceToThree - it reconstructs the Face (persisted storage form)
 * from the THREE.js workPlane Group entity.
 *
 * @param workPlane - The THREE.Group workPlane entity (contains position, rotation, and shape property)
 * @returns A Face with the reconstructed Plane3 and Polygon
 */
export function threeToFace(workPlane: WorkPlane): Face {
  // Ensure matrix is up to date
  workPlane.updateMatrixWorld(true);

  // Extract Plane3 from workPlane Group
  const plane = workPlaneToPlane3(workPlane);

  // Use the stored THREE.Shape to preserve holes
  // Convert THREE.Shape back to Polygon
  const polygon = shapeToPolygon(workPlane.shape);

  return {
    plane,
    polygon,
  };
}

/**
 * Converts a workPlane Group back to a Plane3.
 *
 * Extracts the origin, normal, and u vector from the Group's position and rotation matrix.
 */
function workPlaneToPlane3(workPlane: THREE.Group): Plane3 {
  // Ensure matrix is up to date
  workPlane.updateMatrixWorld(true);

  // Origin comes from Group position
  const origin: Vec3 = [
    workPlane.position.x,
    workPlane.position.y,
    workPlane.position.z,
  ];

  // Extract basis vectors from the rotation matrix
  // The matrix columns are: [u, v, normal, origin]
  // We use the local matrix (rotation only, no translation)
  const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
    workPlane.rotation
  );

  const uThree = new THREE.Vector3();
  const vThree = new THREE.Vector3();
  const normalThree = new THREE.Vector3();

  // Extract the basis vectors from the rotation matrix
  // Column 0: u (X-axis in local space)
  uThree.setFromMatrixColumn(rotationMatrix, 0);
  // Column 1: v (Y-axis in local space)
  vThree.setFromMatrixColumn(rotationMatrix, 1);
  // Column 2: normal (Z-axis in local space)
  normalThree.setFromMatrixColumn(rotationMatrix, 2);

  // Convert to geom Vec3 format
  const normal: Vec3 = [normalThree.x, normalThree.y, normalThree.z];

  const u: Vec3 = [uThree.x, uThree.y, uThree.z];

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
 * Note: This loses hole information - use shapeToPolygon instead.
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
 * Alternative: Convert from workPlane Group with preserved hole information.
 * This version uses the stored THREE.Shape to preserve holes.
 * Same as threeToFace, but kept for backwards compatibility.
 */
export function threeToFaceFromShape(workPlane: WorkPlane): Face {
  return threeToFace(workPlane);
}
