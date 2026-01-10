import * as THREE from "three";
import { LoftEntity } from "../entity/loftEntity";
import { PolylineEntity } from "../entity/polylineEntity";
import { Plane3, Polyline2, Vec3 } from "../geom/geomTypes";
import { polyline2Shift } from "../geom/polyline2";
import {
  computeDefaultU,
  vec3Cross,
  vec3Length,
  vec3Normalize,
} from "../geom/vec3";
import { Doc } from "../state/doc";
import { LoftId, PolylineId, WorkPlaneId } from "../util/uid";

// Number of subdivisions for loft surfaces (both along polylines and across rungs)
export const LOFT_SUBDIVISIONS = 3;

interface RenderedPolyline {
  id: string;
  vertices: THREE.Vector3[]; // Local 2D coords if on work plane, world coords if standalone
  workPlaneId?: WorkPlaneId; // If present, vertices are in local coords and should be child of work plane
}

interface RenderedLoft {
  id: string;
  rungs: THREE.Vector3[][]; // Array of rungs, each rung is [v1, v2] connecting corresponding vertices
  subdivisions: number; // Number of subdivisions between rungs
}

export type WorkPlane = THREE.Group & {
  shape: THREE.Shape;
};

function plane3ToWorkPlane(plane: Plane3): THREE.Group {
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

function polylineToThree(
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

export function computeLoftRungs(
  polyline1: Polyline2,
  polyline2: Polyline2,
  workPlane1: THREE.Group | undefined,
  workPlane2: THREE.Group | undefined,
  subdivisions: number = LOFT_SUBDIVISIONS
): THREE.Vector3[][] {
  const vertices1 = polyline2ToWorldVertices(polyline1, workPlane1);
  const vertices2 = polyline2ToWorldVertices(polyline2, workPlane2);

  const subdividedVertices1 = subdivideVertices(vertices1, subdivisions);
  const subdividedVertices2 = subdivideVertices(vertices2, subdivisions);

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
    rungs.push([
      subdividedVertices1[Math.min(i, lastIdx1)],
      subdividedVertices2[Math.min(i, lastIdx2)],
    ]);
  }

  return rungs;
}

function loftToThree(
  id: LoftId,
  loftEntity: LoftEntity,
  workPlanes: Array<{ workPlane: THREE.Group; id: string }>,
  polylines: Doc["polylines"]
): RenderedLoft | null {
  const pl1 = polylines[loftEntity.polyline1];
  const pl2 = polylines[loftEntity.polyline2];
  if (!pl1 || !pl2) {
    return null;
  }

  const workPlane1 = pl1.workPlaneId
    ? workPlanes.find((wp) => wp.id === pl1.workPlaneId)?.workPlane
    : undefined;
  const workPlane2 = pl2.workPlaneId
    ? workPlanes.find((wp) => wp.id === pl2.workPlaneId)?.workPlane
    : undefined;

  const shiftedPolyline1 = polyline2Shift(
    pl1.polyline,
    loftEntity.polyline1Shift ?? 0
  );
  const shiftedPolyline2 = polyline2Shift(
    pl2.polyline,
    loftEntity.polyline2Shift ?? 0
  );

  const rungs = computeLoftRungs(
    shiftedPolyline1,
    shiftedPolyline2,
    workPlane1,
    workPlane2,
    LOFT_SUBDIVISIONS
  );

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

function polyline2ToWorldVertices(
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
