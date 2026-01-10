import * as THREE from "three";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LoftEntity } from "../entity/loftEntity";
import { PolylineEntity } from "../entity/polylineEntity";
import { Face, Plane3, Polygon, Polyline2, Vec3 } from "../geom/geomTypes";
import {
  computeDefaultU,
  vec3Cross,
  vec3Length,
  vec3Normalize,
} from "../geom/vec3";
import { Doc } from "../state/doc";
import { LoftId, PolylineId, WorkPlaneId } from "../util/uid";

export interface RenderedPolyline {
  id: string;
  vertices: THREE.Vector3[]; // Local 2D coords if on work plane, world coords if standalone
  workPlaneId?: WorkPlaneId; // If present, vertices are in local coords and should be child of work plane
}

export interface RenderedLoft {
  id: string;
  rungs: THREE.Vector3[][]; // Array of rungs, each rung is [v1, v2] connecting corresponding vertices
  subdivisions: number; // Number of subdivisions between rungs
}

export type WorkPlane = THREE.Group & {
  shape: THREE.Shape;
};

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

export function plane3ToWorkPlane(plane: Plane3): THREE.Group {
  const normalGeom = vec3Normalize(plane.normal);
  const normalThree = new THREE.Vector3(
    normalGeom[0],
    normalGeom[1],
    normalGeom[2]
  );

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
      uGeom = computeDefaultU(normalGeom);
    } else {
      uGeom = vec3Normalize(uGeom);
    }
  } else {
    uGeom = computeDefaultU(normalGeom);
  }

  const vGeom = vec3Normalize(vec3Cross(normalGeom, uGeom));

  const uThree = new THREE.Vector3(uGeom[0], uGeom[1], uGeom[2]);
  const vThree = new THREE.Vector3(vGeom[0], vGeom[1], vGeom[2]);

  const rotationMatrix = new THREE.Matrix4();
  rotationMatrix.makeBasis(uThree, vThree, normalThree);

  const workPlane = new THREE.Group();
  workPlane.position.set(plane.origin[0], plane.origin[1], plane.origin[2]);
  const rotation = new THREE.Euler().setFromRotationMatrix(rotationMatrix);
  workPlane.rotation.copy(rotation);
  workPlane.updateMatrixWorld(true);

  return workPlane;
}

export function loftVerticesToLineGeometry(
  vertices1: THREE.Vector3[],
  vertices2: THREE.Vector3[]
): LineGeometry {
  const positions: number[] = [];

  const maxCount = Math.max(vertices1.length, vertices2.length);

  // Get the last vertex index for each polyline
  const lastIdx1 = vertices1.length > 0 ? vertices1.length - 1 : 0;
  const lastIdx2 = vertices2.length > 0 ? vertices2.length - 1 : 0;

  for (let i = 0; i < maxCount; i++) {
    // Determine which vertex indices to use
    const idx1 = Math.min(i, lastIdx1);
    const idx2 = Math.min(i, lastIdx2);

    const v1 = vertices1[idx1];
    const v2 = vertices2[idx2];

    // Add line segment vertices (world space 3D positions)
    // LineGeometry handles consecutive pairs as line segments automatically
    positions.push(v1.x, v1.y, v1.z);
    positions.push(v2.x, v2.y, v2.z);
  }

  const geometry = new LineGeometry();
  geometry.setPositions(positions);

  return geometry;
}

export function workPlanesTableToThree(
  workPlanes: Doc["workPlanes"]
): Array<{ workPlane: THREE.Group; id: string }> {
  const result: Array<{ workPlane: THREE.Group; id: string }> = [];
  for (const [id, workPlaneEntity] of Object.entries(workPlanes)) {
    const workPlane = plane3ToWorkPlane(workPlaneEntity.plane3);
    result.push({ workPlane, id });
  }
  return result;
}

export function polylineToThree(
  id: PolylineId,
  polylineEntity: PolylineEntity
): RenderedPolyline {
  const count = Math.floor(polylineEntity.polyline.length / 2);
  const vertices: THREE.Vector3[] = [];

  for (let i = 0; i < count; i++) {
    const x = polylineEntity.polyline[i * 2];
    const y = polylineEntity.polyline[i * 2 + 1];
    // For polylines on work planes, use local 2D coordinates (z=0)
    // For standalone polylines, we'll transform to world space later
    const vertex = new THREE.Vector3(x, y, 0);
    vertices.push(vertex);
  }

  if (polylineEntity.workPlaneId) {
    // Local coordinates - will be transformed by work plane Group
    return {
      id,
      vertices,
      workPlaneId: polylineEntity.workPlaneId,
    };
  } else {
    // Standalone polyline - transform to world space now
    const worldVertices = polyline2ToWorldVertices(
      polylineEntity.polyline,
      undefined
    );
    return {
      id,
      vertices: worldVertices,
    };
  }
}

export function polylineTableToThree(
  polylines: Doc["polylines"]
): RenderedPolyline[] {
  const result: RenderedPolyline[] = [];
  for (const [id, polylineEntity] of Object.entries(polylines)) {
    result.push(polylineToThree(id as PolylineId, polylineEntity));
  }
  return result;
}

// Number of subdivisions for loft surfaces (both along polylines and across rungs)
export const LOFT_SUBDIVISIONS = 3;

// Subdivide vertices along a polyline by adding intermediate points
function subdivideVertices(
  vertices: THREE.Vector3[],
  subdivisions: number
): THREE.Vector3[] {
  if (vertices.length < 2 || subdivisions < 1) return vertices;

  const result: THREE.Vector3[] = [];
  for (let i = 0; i < vertices.length - 1; i++) {
    result.push(vertices[i].clone());
    const v1 = vertices[i];
    const v2 = vertices[i + 1];
    for (let j = 1; j <= subdivisions; j++) {
      const t = j / (subdivisions + 1);
      result.push(new THREE.Vector3().lerpVectors(v1, v2, t));
    }
  }
  result.push(vertices[vertices.length - 1].clone());
  return result;
}

export function loftToThree(
  id: LoftId,
  loftEntity: LoftEntity,
  workPlanes: Array<{ workPlane: THREE.Group; id: string }>,
  polylines: Doc["polylines"]
): RenderedLoft | null {
  const polyline1Entity = polylines[loftEntity.polyline1];
  const polyline2Entity = polylines[loftEntity.polyline2];
  if (!polyline1Entity || !polyline2Entity) {
    return null;
  }

  // Get work planes for transformation
  const workPlane1 = polyline1Entity.workPlaneId
    ? workPlanes.find((wp) => wp.id === polyline1Entity.workPlaneId)?.workPlane
    : undefined;
  const workPlane2 = polyline2Entity.workPlaneId
    ? workPlanes.find((wp) => wp.id === polyline2Entity.workPlaneId)?.workPlane
    : undefined;

  // Transform polyline vertices to world space
  const vertices1 = polyline2ToWorldVertices(
    polyline1Entity.polyline,
    workPlane1
  );
  const vertices2 = polyline2ToWorldVertices(
    polyline2Entity.polyline,
    workPlane2
  );

  // Subdivide both polylines for smoother surfaces
  const subdividedVertices1 = subdivideVertices(vertices1, LOFT_SUBDIVISIONS);
  const subdividedVertices2 = subdivideVertices(vertices2, LOFT_SUBDIVISIONS);

  // Combine vertices into loft segments (ladder rungs: array of arrays)
  const rungs: THREE.Vector3[][] = [];
  const maxCount = Math.max(
    subdividedVertices1.length,
    subdividedVertices2.length
  );
  const lastIdx1 =
    subdividedVertices1.length > 0 ? subdividedVertices1.length - 1 : 0;
  const lastIdx2 =
    subdividedVertices2.length > 0 ? subdividedVertices2.length - 1 : 0;

  for (let i = 0; i < maxCount; i++) {
    const idx1 = Math.min(i, lastIdx1);
    const idx2 = Math.min(i, lastIdx2);
    // Each rung connects corresponding vertices (or last vertex if one is shorter)
    rungs.push([subdividedVertices1[idx1], subdividedVertices2[idx2]]);
  }

  return { id, rungs, subdivisions: LOFT_SUBDIVISIONS };
}

export function loftTableToThree(
  workPlanes: Array<{ workPlane: THREE.Group; id: string }>,
  polylines: Doc["polylines"],
  lofts: Doc["lofts"]
): RenderedLoft[] {
  const result: RenderedLoft[] = [];
  for (const [id, loftEntity] of Object.entries(lofts)) {
    const rendered = loftToThree(
      id as LoftId,
      loftEntity,
      workPlanes,
      polylines
    );
    if (rendered) {
      result.push(rendered);
    }
  }
  return result;
}

export function polyline2ToWorldVertices(
  polyline: Polyline2,
  workPlane?: THREE.Group
): THREE.Vector3[] {
  const vertices: THREE.Vector3[] = [];
  const count = Math.floor(polyline.length / 2);

  for (let i = 0; i < count; i++) {
    const x = polyline[i * 2];
    const y = polyline[i * 2 + 1];
    const localPoint = new THREE.Vector3(x, y, 0);

    if (workPlane) {
      // Transform to world space using work plane's matrix
      workPlane.updateMatrixWorld(true);
      localPoint.applyMatrix4(workPlane.matrixWorld);
    }

    vertices.push(localPoint);
  }

  return vertices;
}

export function faceToThree(face: Face): WorkPlane {
  const { plane, polygon } = face;
  const workPlane = plane3ToWorkPlane(plane);
  const shape = polygonToShape(polygon);
  (workPlane as WorkPlane).shape = shape;

  return workPlane as WorkPlane;
}

export function polyline2ToPath(polyline: Polyline2): THREE.Path {
  const path = new THREE.Path();
  if (polyline.length < 2) {
    return path;
  }
  path.moveTo(polyline[0], polyline[1]);
  for (let i = 2; i < polyline.length; i += 2) {
    path.lineTo(polyline[i], polyline[i + 1]);
  }
  return path;
}

export function vec3GeomToThree(vec: Vec3): Vec3 {
  return [vec[0], vec[1], vec[2]];
}
