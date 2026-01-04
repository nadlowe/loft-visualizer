import * as THREE from "three";
import { Face, Plane3, Polygon, Polyline2, Vec3 } from "../geom/geomTypes";
import { plane3New } from "../geom/plane3";
import { vec3Normalize } from "../geom/vec3";
import { WorkPlane } from "./geomToThree";

function shapeToPolygon(shape: THREE.Shape): Polygon {
  const polygon: Polygon = [];

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

  shape.holes.forEach((hole) => {
    const holePoints = hole.getPoints();
    const holePolyline: Polyline2 = [];
    holePoints.forEach((point) => {
      holePolyline.push(point.x, point.y);
    });

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

export function threeToFace(workPlane: WorkPlane): Face {
  workPlane.updateMatrixWorld(true);
  return {
    plane: workPlaneToPlane3(workPlane),
    polygon: shapeToPolygon(workPlane.shape),
  };
}

function workPlaneToPlane3(workPlane: THREE.Group): Plane3 {
  workPlane.updateMatrixWorld(true);

  const origin: Vec3 = [
    workPlane.position.x,
    workPlane.position.y,
    workPlane.position.z,
  ];

  const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(
    workPlane.rotation
  );

  const uThree = new THREE.Vector3();
  const vThree = new THREE.Vector3();
  const normalThree = new THREE.Vector3();

  uThree.setFromMatrixColumn(rotationMatrix, 0);
  vThree.setFromMatrixColumn(rotationMatrix, 1);
  normalThree.setFromMatrixColumn(rotationMatrix, 2);

  const normal: Vec3 = [normalThree.x, normalThree.y, normalThree.z];
  const u: Vec3 = [uThree.x, uThree.y, uThree.z];

  const normalizedNormal = vec3Normalize(normal);
  const normalizedU = vec3Normalize(u);

  return plane3New(origin, normalizedNormal, normalizedU);
}

function shapeGeometryToPolygon(
  shapeGeometry: THREE.BufferGeometry,
  matrixInverse: THREE.Matrix4
): Polygon {
  const positions = shapeGeometry.attributes.position;
  if (!positions) {
    throw new Error("Geometry has no position attribute");
  }

  const clonedGeometry = shapeGeometry.clone();
  const rotationMatrixInverse = matrixInverse.clone();
  rotationMatrixInverse.setPosition(0, 0, 0);

  clonedGeometry.applyMatrix4(rotationMatrixInverse);

  const transformedPositions = clonedGeometry.attributes.position;
  const vertexCount = transformedPositions.count;

  const vertices: number[] = [];
  for (let i = 0; i < vertexCount; i++) {
    const x = transformedPositions.getX(i);
    const y = transformedPositions.getY(i);
    vertices.push(x, y);
  }

  const outer: Polyline2 = vertices;

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

  return [outer];
}

export function threeToFaceFromShape(workPlane: WorkPlane): Face {
  return threeToFace(workPlane);
}
