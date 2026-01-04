import { StateCreator } from "zustand";
import { LoftEntity } from "../entity/loftEntity";
import { PolylineEntity } from "../entity/polylineEntity";
import { WorkPlaneEntity } from "../entity/workPlaneEntity";
import { LoftId, PolylineId, WorkPlaneId } from "../util/uid";
import { defaultDocInit } from "./defaultDoc";
import { Doc } from "./doc";
import {
  deleteDocFromStorage,
  getAllDocsFromStorage,
  loadDocFromStorage,
  SavedDoc,
  saveDocToStorage,
} from "./persistence";

export interface DocSlice {
  doc: Doc;
  setDoc: (doc: Doc) => void;
  resetDoc: () => void;

  // WorkPlane transactions
  addWorkPlane: (entity: WorkPlaneEntity) => void;
  updateWorkPlane: (
    id: WorkPlaneId,
    updater: (entity: WorkPlaneEntity) => WorkPlaneEntity
  ) => void;
  removeWorkPlane: (id: WorkPlaneId) => void;
  getWorkPlane: (id: WorkPlaneId) => WorkPlaneEntity | undefined;

  // Polyline transactions
  addPolyline: (entity: PolylineEntity) => void;
  updatePolyline: (
    id: PolylineId,
    updater: (entity: PolylineEntity) => PolylineEntity
  ) => void;
  removePolyline: (id: PolylineId) => void;
  getPolyline: (id: PolylineId) => PolylineEntity | undefined;

  // Loft transactions
  addLoft: (entity: LoftEntity) => void;
  updateLoft: (id: LoftId, updater: (entity: LoftEntity) => LoftEntity) => void;
  removeLoft: (id: LoftId) => void;
  getLoft: (id: LoftId) => LoftEntity | undefined;

  // Batch transaction
  transact: (updater: (doc: Doc) => Doc) => void;

  // Persistence
  saveDoc: () => void;
  loadDoc: (docId: string) => boolean;
  newDoc: () => void;
  deleteDoc: (docId: string) => void;
  getSavedDocs: () => SavedDoc[];
}

export const createDocSlice: StateCreator<DocSlice> = (set, get) => ({
  doc: defaultDocInit(),
  setDoc: (doc) => set({ doc }),
  resetDoc: () => set({ doc: defaultDocInit() }),

  // WorkPlane transactions
  addWorkPlane: (entity) =>
    set((state) => ({
      doc: {
        ...state.doc,
        workPlanes: {
          ...state.doc.workPlanes,
          [entity.id]: entity,
        },
      },
    })),
  updateWorkPlane: (id, updater) =>
    set((state) => {
      const entity = state.doc.workPlanes[id];
      if (!entity) return state;
      return {
        doc: {
          ...state.doc,
          workPlanes: {
            ...state.doc.workPlanes,
            [id]: updater(entity),
          },
        },
      };
    }),
  removeWorkPlane: (id) =>
    set((state) => {
      const { [id]: removed, ...workPlanes } = state.doc.workPlanes;
      return {
        doc: {
          ...state.doc,
          workPlanes,
        },
      };
    }),
  getWorkPlane: (id) => get().doc.workPlanes[id],

  // Polyline transactions
  addPolyline: (entity) =>
    set((state) => ({
      doc: {
        ...state.doc,
        polylines: {
          ...state.doc.polylines,
          [entity.id]: entity,
        },
      },
    })),
  updatePolyline: (id, updater) =>
    set((state) => {
      const entity = state.doc.polylines[id];
      if (!entity) return state;
      return {
        doc: {
          ...state.doc,
          polylines: {
            ...state.doc.polylines,
            [id]: updater(entity),
          },
        },
      };
    }),
  removePolyline: (id) =>
    set((state) => {
      const { [id]: removed, ...polylines } = state.doc.polylines;
      return {
        doc: {
          ...state.doc,
          polylines,
        },
      };
    }),
  getPolyline: (id) => get().doc.polylines[id],

  // Loft transactions
  addLoft: (entity) =>
    set((state) => ({
      doc: {
        ...state.doc,
        lofts: {
          ...state.doc.lofts,
          [entity.id]: entity,
        },
      },
    })),
  updateLoft: (id, updater) =>
    set((state) => {
      const entity = state.doc.lofts[id];
      if (!entity) return state;
      return {
        doc: {
          ...state.doc,
          lofts: {
            ...state.doc.lofts,
            [id]: updater(entity),
          },
        },
      };
    }),
  removeLoft: (id) =>
    set((state) => {
      const { [id]: removed, ...lofts } = state.doc.lofts;
      return {
        doc: {
          ...state.doc,
          lofts,
        },
      };
    }),
  getLoft: (id) => get().doc.lofts[id],

  // Generic transaction for complex operations
  transact: (updater) =>
    set((state) => ({
      doc: updater(state.doc),
    })),

  // Persistence
  saveDoc: () => {
    const doc = get().doc;
    saveDocToStorage(doc);
  },
  loadDoc: (docId: string) => {
    const loaded = loadDocFromStorage(docId);
    if (loaded) {
      set({ doc: loaded });
      return true;
    }
    return false;
  },
  newDoc: () => {
    set({ doc: defaultDocInit() });
  },
  deleteDoc: (docId: string) => {
    deleteDocFromStorage(docId);
    const currentDoc = get().doc;
    if (currentDoc.id === docId) {
      set({ doc: defaultDocInit() });
    }
  },
  getSavedDocs: () => getAllDocsFromStorage(),
});
