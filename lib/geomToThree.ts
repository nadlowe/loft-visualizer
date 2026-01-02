import * as THREE from "three";
import { Face, Plane3, Polygon, Vector3 } from "./geom";

/**
 * Conversion: [x, y, z] → [y, z, x]
 */
function vector3ToThree(vec3: Vector3): THREE.Vector3 {
    return new THREE.Vector3(vec3[1], vec3[2], vec3[0]);
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
 * Builds a transformation matrix from a plane.
 * The matrix transforms from the plane's local space to world space.
 * Returns both the full matrix (with translation) and the rotation-only matrix.
 */
function buildPlaneTransformation(plane: Plane3): {
    fullMatrix: THREE.Matrix4;
    rotationMatrix: THREE.Matrix4;
    position: [number, number, number];
} {
    const normal = vector3ToThree(plane.normal);
    const origin = vector3ToThree(plane.origin);

    // Build orthonormal basis (u, v, normal) that spans the plane
    const worldUp = new THREE.Vector3(0, 1, 0);
    let u = new THREE.Vector3().crossVectors(worldUp, normal).normalize();
    if (u.length() < 0.001) {
        u = new THREE.Vector3()
            .crossVectors(new THREE.Vector3(1, 0, 0), normal)
            .normalize();
    }
    const v = new THREE.Vector3().crossVectors(normal, u).normalize();

    // Create rotation matrix: [u, v, normal] as columns
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeBasis(u, v, normal);

    // Create full matrix with translation
    const fullMatrix = rotationMatrix.clone();
    fullMatrix.setPosition(origin);

    // Convert origin to Three.js coordinates for position
    const position: [number, number, number] = [
        origin.x, // Three.js X
        origin.y, // Three.js Y
        origin.z, // Three.js Z
    ];

    return { fullMatrix, rotationMatrix, position };
}

/**
 * Converts a Face to a THREE.BufferGeometry for rendering.
 *
 * The polygon's 2D coordinates (x, y) are in the plane's local space.
 * We transform them to 3D using the plane's origin and basis vectors.
 *
 * Returns geometry positioned at origin (rotation/orientation baked in)
 * and the position where the mesh should be placed.
 */
export function faceToThree(face: Face): {
    geometry: THREE.BufferGeometry;
    position: [number, number, number];
} {
    const { plane, polygon } = face;

    // Step 1: Convert polygon to 2D shape (pure 2D operation)
    const shape = polygonToShape(polygon);

    // Step 2: Build transformation from plane (pure transformation logic)
    const { rotationMatrix, position } = buildPlaneTransformation(plane);

    // Step 3: Create geometry in XY plane, then apply only rotation (no translation)
    const shapeGeometry = new THREE.ShapeGeometry(shape);
    shapeGeometry.applyMatrix4(rotationMatrix);

    return { geometry: shapeGeometry, position };
}
