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
    return findHandleInSet(get().selectedHandles, handle) !== undefined;
  },
  select: (handle) => {
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
    set({ selectedHandles: new Set([handle]) });
  },
  selectMultiple: (handles) => {
    set({ selectedHandles: new Set(handles) });
  },
  clearSelection: () => set({ selectedHandles: new Set() }),
  getSelectedCount: () => get().selectedHandles.size,
});
