import { StateCreator } from "zustand";
import { BaseEntity } from "../entity/baseEntity";
import { Entity } from "../entity/entity";
import {
  deepDuplicateEntity as deepDuplicateEntityFn,
  duplicateEntity as duplicateEntityFn,
} from "../entity/entityTools/entityDuplicate";
import { entityTypeToDocField } from "../entity/entityTools/entityTypeToDocField";
import { EntityTypeToEntity } from "../entity/entityTools/entityTypeToEntity";
import { handleNew } from "../entity/handleTools/handleNew";
import { parseHandle } from "../entity/handleTools/handleTools";
import { EntityHandle, SelectableHandle } from "../entity/handleTypes";
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
    updater: (
      entity: EntityTypeToEntity[H["type"]]
    ) => EntityTypeToEntity[H["type"]],
    snapshot?: boolean
  ) => void;
  deleteEntity: (handle: EntityHandle) => void;
  getEntity: <H extends EntityHandle>(
    handle: H
  ) => EntityTypeToEntity[H["type"]] | undefined;
  duplicateEntity: (handle: EntityHandle) => EntityHandle | null;
  deepDuplicateEntity: (handle: EntityHandle) => EntityHandle | null;
  setHidden: (handles: EntityHandle[], hidden: boolean) => void;

  // Batch transaction
  transact: (updater: (doc: Doc) => Doc) => void;

  // Persistence
  saveDoc: () => void;
  loadDoc: (docId: string) => boolean;
  newDoc: () => void;
  deleteDoc: (docId: string) => void;
  getSavedDocs: () => SavedDoc[];
  saveDocToFile: () => void;
  loadDocFromFile: () => void;
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
        selectedHandles: new Set([handleNew(entity.type, entity.id)]),
      }));
    },
    updateEntity: <H extends EntityHandle>(
      handle: H,
      updater: (
        entity: EntityTypeToEntity[H["type"]]
      ) => EntityTypeToEntity[H["type"]],
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
              [id]: updater(entity as EntityTypeToEntity[H["type"]]),
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
        | EntityTypeToEntity[H["type"]]
        | undefined;
    },
    duplicateEntity: (handle, selectNew = true) => {
      const result = duplicateEntityFn(get().doc, handle);
      if (!result) return null;

      transact((state) => ({ doc: result.newDoc }));

      if (selectNew) {
        get().selectOnly(result.newHandle);
      }
      return result.newHandle;
    },

    deepDuplicateEntity: (handle, selectNew = true) => {
      const result = deepDuplicateEntityFn(get().doc, handle);
      if (!result) return null;

      transact((state) => ({ doc: result.newDoc }));

      if (selectNew) {
        get().selectOnly(result.newHandle);
      }
      return result.newHandle;
    },

    setHidden: (handles, hidden) => {
      transact((state) => {
        let newDoc = { ...state.doc };

        for (const handle of handles) {
          const { type, id } = parseHandle(handle);
          const fieldName = entityTypeToDocField[type];
          const entity = (newDoc[fieldName] as Record<string, BaseEntity<any>>)[
            id
          ];
          if (!entity) continue;

          newDoc = {
            ...newDoc,
            [fieldName]: {
              ...(newDoc[fieldName] as Record<string, BaseEntity<any>>),
              [id]: { ...entity, hidden },
            },
          };
        }

        return { doc: newDoc };
      });
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

    saveDocToFile: () => {
      const doc = get().doc;
      const dataStr = JSON.stringify(doc, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${doc.name || "document"}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    loadDocFromFile: () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const loadedDoc = JSON.parse(event.target?.result as string);
            if (
              loadedDoc.id &&
              loadedDoc.workPlanes &&
              loadedDoc.polylines &&
              loadedDoc.lofts
            ) {
              set({ doc: loadedDoc });
              saveDocToStorage(loadedDoc);
            }
          } catch (err) {
            console.error("Failed to parse document:", err);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    },
  };
};
