import * as THREE from "three";
import { Vec3, Polygon, Plane3, Face } from "../geom/geomTypes";
import { Mat4 } from "../geom/mat4";
import {
  vec3Cross,
  vec3Normalize,
  vec3Length,
  computeDefaultU,
} from "../geom/vec3";

function vec3GeomToThree(vec: Vec3): Vec3 {
  return [vec[0], vec[1], vec[2]];
}

/**
 * Converts a polygon to a THREE.Shape (2D, in XY plane).
 * This is a pure 2D operation with no 3D transformation.
 */
function polygonToShape(polygon: Polygon): THREE.Shape {
  const shape = new THREE.Shape();
  const outer = polygon[0];

  // Build outer boundary
  shape.moveTo(outer[0], outer[1]);
  for (let i = 2; i < outer.length; i += 2) {
    shape.lineTo(outer[i], outer[i + 1]);
  }

  // Add holes
  for (let h = 1; h < polygon.length; h++) {
    const hole = polygon[h];
    const holePath = new THREE.Path();
    holePath.moveTo(hole[0], hole[1]);
    for (let i = 2; i < hole.length; i += 2) {
      holePath.lineTo(hole[i], hole[i + 1]);
    }
    shape.holes.push(holePath);
  }

  return shape;
}

export function plane3ToWorkPlane(plane: Plane3): {
  plane: THREE.Plane;
  matrix: THREE.Matrix4;
  matrixInverse: THREE.Matrix4;
} {
  // Normalize the plane's normal (this will be the Z-axis of local space)
  const normalGeom = vec3Normalize(plane.normal);
  const normalThree = new THREE.Vector3(
    normalGeom[0],
    normalGeom[1],
    normalGeom[2]
  );

  // Compute the X-axis (u vector) of the plane's local coordinate system
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
      // u is parallel to normal, fall back to default
      uGeom = computeDefaultU(normalGeom);
    } else {
      uGeom = vec3Normalize(uGeom);
    }
  } else {
    uGeom = computeDefaultU(normalGeom);
  }

  // Compute the Y-axis (v = normal × u) of the plane's local coordinate system
  const vGeom = vec3Normalize(vec3Cross(normalGeom, uGeom));

  // Convert to THREE.js vectors
  const uThree = new THREE.Vector3(uGeom[0], uGeom[1], uGeom[2]);
  const vThree = new THREE.Vector3(vGeom[0], vGeom[1], vGeom[2]);
  const originThree = new THREE.Vector3(
    plane.origin[0],
    plane.origin[1],
    plane.origin[2]
  );

  // Build the local-to-world transformation matrix
  // Columns are: [u, v, normal, origin]
  // This transforms points from the plane's local XY space to world space
  const matrix = new THREE.Matrix4();
  matrix.makeBasis(uThree, vThree, normalThree);
  matrix.setPosition(originThree);

  // Compute inverse for world-to-local transformation
  const matrixInverse = matrix.clone().invert();

  // Create THREE.Plane for ray intersection
  // THREE.Plane is defined by normal and constant (distance from origin)
  // The constant is -normal.dot(origin)
  const planeConstant = -normalThree.dot(originThree);
  const threePlane = new THREE.Plane(normalThree.clone(), planeConstant);

  return {
    plane: threePlane,
    matrix,
    matrixInverse,
  };
}

/**
 * Converts a Face to a THREE.BufferGeometry for rendering.
 *
 * The polygon's 2D coordinates (x, y) are in the plane's local space.
 * We transform them to 3D using the plane's work plane transformation matrix.
 * The geometry is transformed with rotation only (position handled via mesh.position).
 *
 * Returns an object with the geometry and the position from the plane's origin.
 */
export function faceToThree(face: Face): {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
} {
  const { plane, polygon } = face;

  // Step 1: Convert polygon to 2D shape (pure 2D operation)
  const shape = polygonToShape(polygon);

  // Step 2: Create work plane entity from the plane
  const workPlane = plane3ToWorkPlane(plane);

  // Step 3: Create geometry in XY plane, then apply rotation only
  // (translation is handled separately via mesh.position)
  const shapeGeometry = new THREE.ShapeGeometry(shape);
  const rotationMatrix = workPlane.matrix.clone();
  rotationMatrix.setPosition(0, 0, 0); // Remove translation, keep only rotation
  shapeGeometry.applyMatrix4(rotationMatrix);

  // Extract position from plane origin
  const position: [number, number, number] = [
    plane.origin[0],
    plane.origin[1],
    plane.origin[2],
  ];

  return { geometry: shapeGeometry, position };
}
