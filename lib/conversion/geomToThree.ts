import * as THREE from "three";
import { Vec3, Polygon, Plane3, Face } from "../geom/geomTypes";
import { Mat4 } from "../geom/mat4";
import {
  vec3Cross,
  vec3Normalize,
  vec3Length,
  computeDefaultU,
} from "../geom/vec3";

/**
 * WorkPlane type: A THREE.Group that encodes a plane's coordinate system
 * and stores the THREE.Shape to preserve holes during conversion.
 * Geometry can be generated from the shape when needed.
 */
export type WorkPlane = THREE.Group & {
  shape: THREE.Shape; // Preserve original THREE.Shape structure (including holes)
};

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

/**
 * Converts a Plane3 to a THREE.Group workPlane entity.
 *
 * The Group encodes the plane's coordinate system:
 * - position: plane origin
 * - rotation: encodes normal (Z-axis) and u vector (X-axis)
 * - matrix: automatically computed by THREE.js from position/rotation
 *
 * The Group can contain child meshes/geometries that will transform with it.
 */
export function plane3ToWorkPlane(plane: Plane3): THREE.Group {
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

  // Build the rotation matrix from basis vectors
  // Columns are: [u, v, normal]
  const rotationMatrix = new THREE.Matrix4();
  rotationMatrix.makeBasis(uThree, vThree, normalThree);

  // Create the workPlane Group
  const workPlane = new THREE.Group();

  // Set position to plane origin
  workPlane.position.set(plane.origin[0], plane.origin[1], plane.origin[2]);

  // Set rotation from the rotation matrix
  // Extract Euler angles from the rotation matrix (remove translation)
  const rotation = new THREE.Euler().setFromRotationMatrix(rotationMatrix);
  workPlane.rotation.copy(rotation);

  // Update matrix (THREE.js will do this automatically, but we can force it)
  workPlane.updateMatrixWorld(true);

  return workPlane;
}

/**
 * Converts a Face to a THREE.Group workPlane entity.
 *
 * The Face is the persisted storage form (geom kernel).
 * This function generates a THREE.Group that:
 * - Has position and rotation encoding the Plane3
 * - Stores the THREE.Shape as a property (preserves holes)
 * - Automatically computes matrix/matrixWorld for transformations
 *
 * The polygon's 2D coordinates (x, y) are in the plane's local space.
 * Geometry can be generated from the shape when needed.
 *
 * Returns a THREE.Group workPlane entity with shape stored as a property.
 */
export function faceToThree(face: Face): WorkPlane {
  const { plane, polygon } = face;

  // Generate workPlane Group from Plane3
  const workPlane = plane3ToWorkPlane(plane);

  // Generate shape from Polygon
  const shape = polygonToShape(polygon);

  // Store the THREE.Shape as a property
  // Geometry can be generated from the shape when needed
  (workPlane as WorkPlane).shape = shape;

  return workPlane as WorkPlane;
}
