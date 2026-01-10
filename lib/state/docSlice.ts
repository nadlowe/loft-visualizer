import { StateCreator } from "zustand";
import { BaseEntity } from "../entity/baseEntity";
import { Entity, EntityTypeMap } from "../entity/entity";
import { entityTypeToDocField } from "../entity/entityTypeToDocField";
import { handleNew, parseHandle } from "../entity/handle";
import { EntityHandle, SelectableHandle } from "../entity/handleTypes";
import { uid } from "../util/uid";
import { CmdSlice } from "./cmd/cmdSlice";
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
  selectedHandles: Set<SelectableHandle>;
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

  // Generic entity operations
  addEntity: (entity: Entity) => void;
  updateEntity: <H extends EntityHandle>(
    handle: H,
    updater: (entity: EntityTypeMap[H["type"]]) => EntityTypeMap[H["type"]],
    snapshot?: boolean
  ) => void;
  deleteEntity: (handle: EntityHandle) => void;
  getEntity: <H extends EntityHandle>(
    handle: H
  ) => EntityTypeMap[H["type"]] | undefined;
  duplicateEntity: (handle: EntityHandle) => EntityHandle | null;

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

  const transact = (
    updater: (
      state: DocSlice & SelectionSlice & CmdSlice
    ) => Partial<DocSlice & SelectionSlice & CmdSlice>,
    snapshot = true
  ) => {
    if (snapshot) {
      saveSnapshot();
    }
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

    // Generic entity operations
    addEntity: (entity) => {
      const fieldName = entityTypeToDocField[entity.type];
      transact((state) => ({
        doc: {
          ...state.doc,
          [fieldName]: {
            ...(state.doc[fieldName] as Record<string, Entity>),
            [entity.id]: entity,
          },
        },
      }));
    },
    updateEntity: <H extends EntityHandle>(
      handle: H,
      updater: (entity: EntityTypeMap[H["type"]]) => EntityTypeMap[H["type"]],
      snapshot = true
    ) => {
      const { type, id } = parseHandle(handle);
      const fieldName = entityTypeToDocField[type];
      transact((state) => {
        const entity = (state.doc[fieldName] as Record<string, Entity>)[id];
        if (!entity) return {};
        return {
          doc: {
            ...state.doc,
            [fieldName]: {
              ...(state.doc[fieldName] as Record<string, Entity>),
              [id]: updater(entity as EntityTypeMap[H["type"]]),
            },
          },
        };
      }, snapshot);
    },
    deleteEntity: (handle) => {
      const { type, id } = parseHandle(handle);
      const fieldName = entityTypeToDocField[type];
      transact((state) => {
        const currentTable = state.doc[fieldName] as Record<string, Entity>;
        const { [id]: removed, ...rest } = currentTable;
        return {
          doc: {
            ...state.doc,
            [fieldName]: rest,
          },
        };
      });
    },
    getEntity: <H extends EntityHandle>(handle: H) => {
      const { type, id } = parseHandle(handle);
      const fieldName = entityTypeToDocField[type];
      return (get().doc[fieldName] as Record<string, Entity>)[id] as
        | EntityTypeMap[H["type"]]
        | undefined;
    },
    duplicateEntity: (handle, selectNew = true) => {
      const { type, id } = parseHandle(handle);
      const fieldName = entityTypeToDocField[type];
      const entity = (get().doc[fieldName] as Record<string, BaseEntity<any>>)[
        id
      ];
      if (!entity) return null;

      const newId = uid();
      const duplicatedEntity = { ...entity, id: newId };

      transact((state) => ({
        doc: {
          ...state.doc,
          [fieldName]: {
            ...(state.doc[fieldName] as Record<string, BaseEntity<any>>),
            [newId]: duplicatedEntity,
          },
        },
      }));

      const newHandle = handleNew(type, newId);
      if (selectNew) {
        get().selectOnly(newHandle);
      }
      return newHandle;
    },

    // Generic transaction for complex operations
    transact: (updater) => {
      transact((state) => ({
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
