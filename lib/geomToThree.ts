import * as THREE from "three";
import { Vec3, Polygon, Plane3, Face } from "./geom/geomTypes";
import { Mat4 } from "./geom/mat4";
import {
  vec3Cross,
  vec3Normalize,
  vec3Length,
  computeDefaultU,
  vec3Negate,
  vec3Rotate,
} from "./geom/vec3";

/**
 * No coordinate conversion - use xyz directly
 * THREE.js is configured to use Z as up to match geom coordinate system
 */
function vec3GeomToThree(vec: Vec3): Vec3 {
  return [vec[0], vec[1], vec[2]]; // x=x, y=y, z=z
}

/**
 * Converts THREE.Matrix4 to Mat4 (row-major).
 * THREE.Matrix4 stores in column-major order internally.
 */
function threeMatrix4ToMat4(threeMat: THREE.Matrix4): Mat4 {
  const elements = threeMat.elements;
  // THREE stores in column-major: [c0r0, c0r1, c0r2, c0r3, c1r0, ...]
  // We want row-major: [r0c0, r0c1, r0c2, r0c3, r1c0, ...]
  return [
    elements[0],
    elements[4],
    elements[8],
    elements[12], // row 0
    elements[1],
    elements[5],
    elements[9],
    elements[13], // row 1
    elements[2],
    elements[6],
    elements[10],
    elements[14], // row 2
    elements[3],
    elements[7],
    elements[11],
    elements[15], // row 3
  ];
}

/**
 * Converts a Mat4 (row-major) to THREE.Matrix4 (column-major).
 * THREE.Matrix4.set() expects elements in column-major order.
 */
function mat4ToThreeMatrix4(mat: Mat4): THREE.Matrix4 {
  const threeMat = new THREE.Matrix4();
  // THREE.Matrix4.set() expects column-major order
  // Mat4 is row-major: [r0c0, r0c1, r0c2, r0c3, r1c0, r1c1, ...]
  // THREE expects: [r0c0, r1c0, r2c0, r3c0, r0c1, r1c1, ...]
  threeMat.set(
    mat[0],
    mat[4],
    mat[8],
    mat[12], // column 0
    mat[1],
    mat[5],
    mat[9],
    mat[13], // column 1
    mat[2],
    mat[6],
    mat[10],
    mat[14], // column 2
    mat[3],
    mat[7],
    mat[11],
    mat[15] // column 3
  );
  return threeMat;
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

/**
 * Builds a rotation matrix from a plane that transforms from
 * the plane's local XY space to world space (rotation only, no translation).
 * The matrix transforms points from the plane's coordinate system
 * (where the polygon lives) to world space orientation.
 */
function buildPlaneRotationMatrix(plane: Plane3): Mat4 {
  // Get the plane's basis vectors in geom coordinate space
  // normal is the Z-axis of the plane's local space

  const normalGeom = vec3Normalize(vec3Negate(plane.normal));
  // u is the X-axis of the plane's local space
  let uGeom: Vec3;
  if (plane.u) {
    uGeom = vec3Normalize(vec3Negate(plane.u));
    // Ensure u is orthogonal to normal
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
      // Fall back to default computation
      uGeom = computeDefaultU(normalGeom);
    } else {
      uGeom = [uGeom[0] / uLen, uGeom[1] / uLen, uGeom[2] / uLen];
    }
  } else {
    uGeom = computeDefaultU(normalGeom);
  }

  // v is the Y-axis of the plane's local space (u × normal)
  const vGeom = vec3Normalize(vec3Cross(uGeom, normalGeom));

  const uThree = new THREE.Vector3(uGeom[0], uGeom[1], uGeom[2]);
  const vThree = new THREE.Vector3(vGeom[0], vGeom[1], vGeom[2]);
  const normalThree = new THREE.Vector3(
    normalGeom[0],
    normalGeom[1],
    normalGeom[2]
  );

  // Build rotation matrix using THREE.Matrix4.makeBasis
  // Swap u and v for 90-degree rotation
  const threeMatrix = new THREE.Matrix4();
  threeMatrix.makeBasis(vThree, uThree, normalThree);

  // Convert to Mat4 format
  return threeMatrix4ToMat4(threeMatrix);
}

/**
 * Converts a Face to a THREE.BufferGeometry for rendering.
 *
 * The polygon's 2D coordinates (x, y) are in the plane's local space.
 * We transform them to 3D using the plane's basis vectors (rotation only).
 * The geometry is created at the origin; position comes from face.plane.origin.
 *
 * Returns geometry with rotation applied (position handled separately via mesh.position).
 */
export function faceToThree(face: Face): THREE.BufferGeometry {
  const { plane, polygon } = face;

  // Step 1: Convert polygon to 2D shape (pure 2D operation)
  const shape = polygonToShape(polygon);

  // Step 2: Build rotation matrix from plane (rotation only, no translation)
  //const rotationMat = buildPlaneRotationMatrix(plane);

  // Step 3: Create geometry in XY plane, then apply rotation only
  const shapeGeometry = new THREE.ShapeGeometry(shape);
  // const threeMatrix = mat4ToThreeMatrix4(rotationMat);
  // shapeGeometry.applyMatrix4(threeMatrix);

  return shapeGeometry;
}
