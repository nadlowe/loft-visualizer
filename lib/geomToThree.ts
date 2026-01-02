import * as THREE from 'three'
import { Face, Vector3 } from './geom'

/**
 * Converts a kernel Vector3 to Three.js Vector3.
 *
 * Coordinate system differences:
 * - Kernel: x=right, y=depth, z=up (vertical)
 * - Three.js: x=right, y=up (vertical), z=depth
 *
 * Conversion: [x, y, z] → [x, z, y]
 * (swaps y and z to convert kernel's z-up to Three.js's y-up)
 */
function vector3ToThree(vec3: Vector3): THREE.Vector3 {
    return new THREE.Vector3(vec3[0], vec3[2], vec3[1])
}

/**
 * Converts a Face to a THREE.Shape for rendering.
 *
 * The polygon's 2D coordinates (x, y) are in the plane's local space.
 * We transform them to 3D using the plane's origin and basis vectors.
 */
export function faceToThree(face: Face): THREE.BufferGeometry {
    const { plane, polygon } = face

    // Step 1: Build basis transformation matrix
    const normal = vector3ToThree(plane.normal)
    const origin = vector3ToThree(plane.origin)

    // Build orthonormal basis (u, v, normal)
    const worldUp = new THREE.Vector3(0, 1, 0)
    let u = new THREE.Vector3().crossVectors(worldUp, normal).normalize()
    if (u.length() < 0.001) {
        u = new THREE.Vector3().crossVectors(new THREE.Vector3(1, 0, 0), normal).normalize()
    }
    const v = new THREE.Vector3().crossVectors(normal, u).normalize()

    // Create transformation matrix: [u, v, normal] as columns, origin as translation
    const matrix = new THREE.Matrix4()
    matrix.makeBasis(u, v, normal)
    matrix.setPosition(origin)

    // Step 2: Build shape in XY plane (standard basis)
    const shape = new THREE.Shape()
    const outer = polygon[0]
    shape.moveTo(outer[0], outer[1])
    for (let i = 2; i < outer.length; i += 2) {
        shape.lineTo(outer[i], outer[i + 1])
    }

    // Add holes
    for (let h = 1; h < polygon.length; h++) {
        const hole = polygon[h]
        const holePath = new THREE.Path()
        holePath.moveTo(hole[0], hole[1])
        for (let i = 2; i < hole.length; i += 2) {
            holePath.lineTo(hole[i], hole[i + 1])
        }
        shape.holes.push(holePath)
    }

    // Step 3: Create geometry in XY plane, then transform
    const shapeGeometry = new THREE.ShapeGeometry(shape)
    shapeGeometry.applyMatrix4(matrix)

    return shapeGeometry
}
