import { Doc } from "../../state/doc";
import { LoftId, PolylineId, uid, WorkPlaneId } from "../../util/uid";
import { BaseEntity } from "../baseEntity";
import { handleNew } from "../handleTools/handleNew";
import { parseHandle } from "../handleTools/handleTools";
import { EntityHandle } from "../handleTypes";
import { LoftEntity } from "../loftEntity";
import { PolylineEntity } from "../polylineEntity";
import { WorkPlaneEntity } from "../workPlaneEntity";
import { entityTypeToDocField } from "./entityTypeToDocField";
import { nextAvailableName } from "./entityTypeToName";

export interface DuplicateResult {
  newDoc: Doc;
  newHandle: EntityHandle;
}

// Simple shallow duplicate - doesn't duplicate referenced entities
export function duplicateEntity(
  doc: Doc,
  handle: EntityHandle
): DuplicateResult | null {
  const { type, id } = parseHandle(handle);
  const fieldName = entityTypeToDocField[type];
  const entity = (doc[fieldName] as Record<string, BaseEntity<any>>)[id];
  if (!entity) return null;

  const newId = uid();
  const duplicatedEntity = { ...entity, id: newId };

  const newDoc: Doc = {
    ...doc,
    [fieldName]: {
      ...(doc[fieldName] as Record<string, BaseEntity<any>>),
      [newId]: duplicatedEntity,
    },
  };

  return {
    newDoc,
    newHandle: handleNew(type, newId),
  };
}

// Appends parent entity name in parentheses for downstream entities
function withParentName(name: string, parentName: string): string {
  return `${name} (${parentName})`;
}

// Deep duplicate - duplicates entity and all referenced entities
export function deepDuplicateEntity(
  doc: Doc,
  handle: EntityHandle
): DuplicateResult | null {
  const { type, id } = parseHandle(handle);

  if (type === "WORKPLANE") {
    // Work plane has no references, same as regular duplicate
    const workPlane = doc.workPlanes[id as WorkPlaneId];
    if (!workPlane) return null;

    const newId = uid() as WorkPlaneId;
    const duplicatedWorkPlane: WorkPlaneEntity = { ...workPlane, id: newId };

    return {
      newDoc: {
        ...doc,
        workPlanes: {
          ...doc.workPlanes,
          [newId]: duplicatedWorkPlane,
        },
      },
      newHandle: handleNew("WORKPLANE", newId),
    };
  }

  if (type === "POLYLINE") {
    const polyline = doc.polylines[id as PolylineId];
    if (!polyline) return null;

    // Generate next available name for the duplicated polyline
    const newPolylineName = nextAvailableName(doc, polyline.name);
    let newDoc = { ...doc };
    let newWorkPlaneId: WorkPlaneId | undefined;

    // If polyline has a work plane, duplicate it first
    if (polyline.workPlaneId) {
      const workPlane = doc.workPlanes[polyline.workPlaneId];
      if (workPlane) {
        newWorkPlaneId = uid() as WorkPlaneId;
        newDoc = {
          ...newDoc,
          workPlanes: {
            ...newDoc.workPlanes,
            [newWorkPlaneId]: {
              ...workPlane,
              id: newWorkPlaneId,
              name: withParentName(workPlane.name, newPolylineName),
            },
          },
        };
      }
    }

    const newPolylineId = uid() as PolylineId;
    const duplicatedPolyline: PolylineEntity = {
      ...polyline,
      id: newPolylineId,
      name: newPolylineName,
      workPlaneId: newWorkPlaneId,
    };

    newDoc = {
      ...newDoc,
      polylines: {
        ...newDoc.polylines,
        [newPolylineId]: duplicatedPolyline,
      },
    };

    return {
      newDoc,
      newHandle: handleNew("POLYLINE", newPolylineId),
    };
  }

  if (type === "LOFT") {
    const loft = doc.lofts[id as LoftId];
    if (!loft) return null;

    // Generate next available name for the duplicated loft
    const newLoftName = nextAvailableName(doc, loft.name);

    // Look up polylines from the loft
    const polyline1 = doc.polylines[loft.polyline1];
    const polyline2 = doc.polylines[loft.polyline2];

    if (!polyline1 || !polyline2) return null;

    let newDoc = { ...doc };

    // Duplicate work planes for each polyline (look them up from the polylines)
    let newWorkPlaneId1: WorkPlaneId | undefined;
    let newWorkPlaneId2: WorkPlaneId | undefined;

    if (polyline1.workPlaneId) {
      const workPlane1 = doc.workPlanes[polyline1.workPlaneId];
      if (workPlane1) {
        newWorkPlaneId1 = uid() as WorkPlaneId;
        newDoc = {
          ...newDoc,
          workPlanes: {
            ...newDoc.workPlanes,
            [newWorkPlaneId1]: {
              ...workPlane1,
              id: newWorkPlaneId1,
              name: withParentName(workPlane1.name, newLoftName),
            },
          },
        };
      }
    }

    if (polyline2.workPlaneId) {
      const workPlane2 = doc.workPlanes[polyline2.workPlaneId];
      if (workPlane2) {
        newWorkPlaneId2 = uid() as WorkPlaneId;
        newDoc = {
          ...newDoc,
          workPlanes: {
            ...newDoc.workPlanes,
            [newWorkPlaneId2]: {
              ...workPlane2,
              id: newWorkPlaneId2,
              name: withParentName(workPlane2.name, newLoftName),
            },
          },
        };
      }
    }

    // Duplicate polylines with new work plane references
    const newPolylineId1 = uid() as PolylineId;
    const newPolylineId2 = uid() as PolylineId;

    const duplicatedPolyline1: PolylineEntity = {
      ...polyline1,
      id: newPolylineId1,
      workPlaneId: newWorkPlaneId1,
      name: withParentName(polyline1.name, newLoftName),
    };

    const duplicatedPolyline2: PolylineEntity = {
      ...polyline2,
      id: newPolylineId2,
      workPlaneId: newWorkPlaneId2,
      name: withParentName(polyline2.name, newLoftName),
    };

    newDoc = {
      ...newDoc,
      polylines: {
        ...newDoc.polylines,
        [newPolylineId1]: duplicatedPolyline1,
        [newPolylineId2]: duplicatedPolyline2,
      },
    };

    // Duplicate loft with new polyline references
    const newLoftId = uid() as LoftId;
    const duplicatedLoft: LoftEntity = {
      ...loft,
      id: newLoftId,
      name: newLoftName,
      polyline1: newPolylineId1,
      polyline2: newPolylineId2,
    };

    newDoc = {
      ...newDoc,
      lofts: {
        ...newDoc.lofts,
        [newLoftId]: duplicatedLoft,
      },
    };

    return {
      newDoc,
      newHandle: handleNew("LOFT", newLoftId),
    };
  }

  return null;
}
