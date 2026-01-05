import { StateCreator } from "zustand";
import { BaseEntity } from "../entity/baseEntity";
import { entityTypeToDocField } from "../entity/entityTypeToDocField";
import { handleNew, parseHandle } from "../entity/handle";
import { EntityHandle } from "../entity/handleTypes";
import { LoftEntity } from "../entity/loftEntity";
import { PolylineEntity } from "../entity/polylineEntity";
import { WorkPlaneEntity } from "../entity/workPlaneEntity";
import { LoftId, PolylineId, uid, WorkPlaneId } from "../util/uid";
import { CmdSlice } from "./cmdSlice";
import { defaultDocInit } from "./defaultDoc";
import { Doc } from "./doc";
import {
  deleteDocFromStorage,
  getAllDocsFromStorage,
  loadDocFromStorage,
  SavedDoc,
  saveDocToStorage,
} from "./persistence";
import { SelectionSlice } from "./selectionSlice";

export interface HistoryState {
  doc: Doc;
  selectedHandles: Set<EntityHandle>;
}

export interface DocSlice {
  doc: Doc;
  setDoc: (doc: Doc) => void;
  resetDoc: () => void;

  // History
  pastStates: HistoryState[];
  futureStates: HistoryState[];
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;

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

  // Generic entity duplication
  duplicateEntity: (handle: EntityHandle) => EntityHandle | null;

  // Generic entity deletion
  deleteEntity: (handle: EntityHandle) => void;

  // Generic entity update
  updateEntity: (
    handle: EntityHandle,
    updater: (entity: BaseEntity<any>) => BaseEntity<any>
  ) => void;

  // Batch transaction
  transact: (updater: (doc: Doc) => Doc) => void;

  // Persistence
  saveDoc: () => void;
  loadDoc: (docId: string) => boolean;
  newDoc: () => void;
  deleteDoc: (docId: string) => void;
  getSavedDocs: () => SavedDoc[];
}

export const createDocSlice: StateCreator<
  DocSlice & SelectionSlice & CmdSlice,
  [],
  [],
  DocSlice
> = (set, get) => {
  // Helper to save snapshot before state changes
  const saveSnapshot = () => {
    const state = get();
    if (state.cmd === null) {
      set({
        pastStates: [
          ...state.pastStates,
          {
            doc: state.doc,
            selectedHandles: new Set(state.selectedHandles),
          },
        ],
        futureStates: [],
      });

      // Limit history size (keep last 50)
      if (state.pastStates.length >= 50) {
        set({ pastStates: state.pastStates.slice(-49) });
      }
    }
  };

  // Helper to update doc with automatic snapshot saving
  const updateDoc = (
    updater: (
      state: DocSlice & SelectionSlice & CmdSlice
    ) => Partial<DocSlice & SelectionSlice & CmdSlice>
  ) => {
    saveSnapshot();
    set((state) => updater(state));
  };

  return {
    doc: defaultDocInit(),
    setDoc: (doc) => set({ doc }),
    resetDoc: () => set({ doc: defaultDocInit() }),

    // History
    pastStates: [],
    futureStates: [],

    saveSnapshot,

    undo: () => {
      const state = get();

      // If cmd exists, let it handle undo (e.g., removeLastVertex for DRAW_POLYLINE)
      if (state.cmd?.type === "DRAW_POLYLINE") {
        // cmd handles its own undo
        return;
      }

      if (state.pastStates.length > 0) {
        const previousState = state.pastStates[state.pastStates.length - 1];
        set({
          doc: previousState.doc,
          selectedHandles: new Set(previousState.selectedHandles),
          pastStates: state.pastStates.slice(0, -1),
          futureStates: [
            {
              doc: state.doc,
              selectedHandles: new Set(state.selectedHandles),
            },
            ...state.futureStates,
          ],
        });
      }
    },

    redo: () => {
      const state = get();
      if (state.cmd !== null) return; // Don't redo during commands

      if (state.futureStates.length > 0) {
        const nextState = state.futureStates[0];
        set({
          doc: nextState.doc,
          selectedHandles: new Set(nextState.selectedHandles),
          pastStates: [
            ...state.pastStates,
            {
              doc: state.doc,
              selectedHandles: new Set(state.selectedHandles),
            },
          ],
          futureStates: state.futureStates.slice(1),
        });
      }
    },

    // WorkPlane transactions
    addWorkPlane: (entity) => {
      updateDoc((state) => ({
        doc: {
          ...state.doc,
          workPlanes: {
            ...state.doc.workPlanes,
            [entity.id]: entity,
          },
        },
      }));
    },
    updateWorkPlane: (id, updater) => {
      updateDoc((state) => {
        const entity = state.doc.workPlanes[id];
        if (!entity) return {};
        return {
          doc: {
            ...state.doc,
            workPlanes: {
              ...state.doc.workPlanes,
              [id]: updater(entity),
            },
          },
        };
      });
    },
    removeWorkPlane: (id) => {
      updateDoc((state) => {
        const { [id]: removed, ...workPlanes } = state.doc.workPlanes;
        return {
          doc: {
            ...state.doc,
            workPlanes,
          },
        };
      });
    },
    getWorkPlane: (id) => get().doc.workPlanes[id],

    // Polyline transactions
    addPolyline: (entity) => {
      updateDoc((state) => ({
        doc: {
          ...state.doc,
          polylines: {
            ...state.doc.polylines,
            [entity.id]: entity,
          },
        },
      }));
    },
    updatePolyline: (id, updater) => {
      updateDoc((state) => {
        const entity = state.doc.polylines[id];
        if (!entity) return {};
        return {
          doc: {
            ...state.doc,
            polylines: {
              ...state.doc.polylines,
              [id]: updater(entity),
            },
          },
        };
      });
    },
    removePolyline: (id) => {
      updateDoc((state) => {
        const { [id]: removed, ...polylines } = state.doc.polylines;
        return {
          doc: {
            ...state.doc,
            polylines,
          },
        };
      });
    },
    getPolyline: (id) => get().doc.polylines[id],

    // Loft transactions
    addLoft: (entity) => {
      updateDoc((state) => ({
        doc: {
          ...state.doc,
          lofts: {
            ...state.doc.lofts,
            [entity.id]: entity,
          },
        },
      }));
    },
    updateLoft: (id, updater) => {
      updateDoc((state) => {
        const entity = state.doc.lofts[id];
        if (!entity) return {};
        return {
          doc: {
            ...state.doc,
            lofts: {
              ...state.doc.lofts,
              [id]: updater(entity),
            },
          },
        };
      });
    },
    removeLoft: (id) => {
      updateDoc((state) => {
        const { [id]: removed, ...lofts } = state.doc.lofts;
        return {
          doc: {
            ...state.doc,
            lofts,
          },
        };
      });
    },
    getLoft: (id) => get().doc.lofts[id],

    // Generic entity duplication
    duplicateEntity: (handle) => {
      const { type, id } = parseHandle(handle);
      const fieldName = entityTypeToDocField[type];
      const entity = (get().doc[fieldName] as Record<string, BaseEntity<any>>)[
        id as any
      ];
      if (!entity) return null;

      const newId = uid() as any;
      const duplicatedEntity = { ...entity, id: newId };

      updateDoc((state) => ({
        doc: {
          ...state.doc,
          [fieldName]: {
            ...(state.doc[fieldName] as Record<string, BaseEntity<any>>),
            [newId]: duplicatedEntity,
          },
        },
      }));

      return handleNew(type, newId);
    },

    // Generic entity deletion
    deleteEntity: (handle) => {
      const { type, id } = parseHandle(handle);
      const fieldName = entityTypeToDocField[type];

      updateDoc((state) => {
        const currentTable = state.doc[fieldName] as Record<
          string,
          BaseEntity<any>
        >;
        const { [id as any]: removed, ...rest } = currentTable;
        return {
          doc: {
            ...state.doc,
            [fieldName]: rest,
          },
        };
      });
    },

    // Generic entity update
    updateEntity: (handle, updater) => {
      const { type, id } = parseHandle(handle);
      const fieldName = entityTypeToDocField[type];

      updateDoc((state) => {
        const entity = (
          state.doc[fieldName] as Record<string, BaseEntity<any>>
        )[id as any];
        if (!entity) return {};

        const updated = updater(entity);

        const currentTable = state.doc[fieldName] as Record<
          string,
          BaseEntity<any>
        >;
        return {
          doc: {
            ...state.doc,
            [fieldName]: {
              ...currentTable,
              [id]: updated,
            },
          },
        };
      });
    },

    // Generic transaction for complex operations
    transact: (updater) => {
      updateDoc((state) => ({
        doc: updater(state.doc),
      }));
    },

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
  };
};
