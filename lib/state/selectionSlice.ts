import { StateCreator } from "zustand";
import { EntityHandle } from "../entity/handleTypes";

function handleEquals(a: EntityHandle, b: EntityHandle): boolean {
  return a.type === b.type && a.id === b.id;
}

function findHandleInSet(
  set: Set<EntityHandle>,
  handle: EntityHandle
): EntityHandle | undefined {
  for (const h of set) {
    if (handleEquals(h, handle)) {
      return h;
    }
  }
  return undefined;
}

export interface SelectionSlice {
  selectedHandles: Set<EntityHandle>;
  isSelected: (handle: EntityHandle) => boolean;
  select: (handle: EntityHandle) => void;
  deselect: (handle: EntityHandle) => void;
  toggleSelection: (handle: EntityHandle) => void;
  selectOnly: (handle: EntityHandle) => void;
  selectMultiple: (handles: EntityHandle[]) => void;
  clearSelection: () => void;
  getSelectedCount: () => number;
}

export const createSelectionSlice: StateCreator<SelectionSlice> = (
  set,
  get
) => ({
  selectedHandles: new Set<EntityHandle>(),
  isSelected: (handle) => {
    if (typeof handle === "string") {
      console.error(
        "isSelected received string (handleHash):",
        handle,
        new Error().stack
      );
      return false;
    }
    return findHandleInSet(get().selectedHandles, handle) !== undefined;
  },
  select: (handle) => {
    if (typeof handle === "string") {
      console.error(
        "select received string (handleHash):",
        handle,
        new Error().stack
      );
      return;
    }
    set((state) => {
      const existing = findHandleInSet(state.selectedHandles, handle);
      if (existing) {
        return {};
      }
      return {
        selectedHandles: new Set([...state.selectedHandles, handle]),
      };
    });
  },
  deselect: (handle) => {
    if (typeof handle === "string") {
      console.error(
        "deselect received string (handleHash):",
        handle,
        new Error().stack
      );
      return;
    }
    set((state) => {
      const newSet = new Set(state.selectedHandles);
      const existing = findHandleInSet(newSet, handle);
      if (existing) {
        newSet.delete(existing);
      }
      return { selectedHandles: newSet };
    });
  },
  toggleSelection: (handle) => {
    if (typeof handle === "string") {
      console.error(
        "toggleSelection received string (handleHash):",
        handle,
        new Error().stack
      );
      return;
    }
    set((state) => {
      const newSet = new Set(state.selectedHandles);
      const existing = findHandleInSet(newSet, handle);
      if (existing) {
        newSet.delete(existing);
      } else {
        newSet.add(handle);
      }
      return { selectedHandles: newSet };
    });
  },
  selectOnly: (handle) => {
    if (typeof handle === "string") {
      console.error(
        "selectOnly received string (handleHash):",
        handle,
        new Error().stack
      );
      return;
    }
    set({ selectedHandles: new Set([handle]) });
  },
  selectMultiple: (handles) => {
    const stringHandles = handles.filter((h) => typeof h === "string");
    if (stringHandles.length > 0) {
      console.error(
        "selectMultiple received strings (handleHashes):",
        stringHandles,
        new Error().stack
      );
    }
    const validHandles = handles.filter(
      (h): h is EntityHandle => typeof h !== "string"
    );
    set({ selectedHandles: new Set(validHandles) });
  },
  clearSelection: () => set({ selectedHandles: new Set() }),
  getSelectedCount: () => get().selectedHandles.size,
});
