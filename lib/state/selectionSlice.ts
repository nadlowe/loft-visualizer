import { StateCreator } from "zustand";
import { EntityHandle } from "../util/handleTypes";

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
  isSelected: (handle) => get().selectedHandles.has(handle),
  select: (handle) =>
    set((state) => ({
      selectedHandles: new Set([...state.selectedHandles, handle]),
    })),
  deselect: (handle) =>
    set((state) => {
      const newSet = new Set(state.selectedHandles);
      newSet.delete(handle);
      return { selectedHandles: newSet };
    }),
  toggleSelection: (handle) =>
    set((state) => {
      const newSet = new Set(state.selectedHandles);
      if (newSet.has(handle)) {
        newSet.delete(handle);
      } else {
        newSet.add(handle);
      }
      return { selectedHandles: newSet };
    }),
  selectOnly: (handle) => set({ selectedHandles: new Set([handle]) }),
  selectMultiple: (handles) => set({ selectedHandles: new Set(handles) }),
  clearSelection: () => set({ selectedHandles: new Set() }),
  getSelectedCount: () => get().selectedHandles.size,
});
