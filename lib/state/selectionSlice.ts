import { StateCreator } from "zustand";
import { SelectableHandle } from "../entity/handleTypes";
import { PolylineId } from "../util/uid";

function handleEquals(a: SelectableHandle, b: SelectableHandle): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "VERTEX" && b.type === "VERTEX") {
    return a.polylineId === b.polylineId && a.vertexIndex === b.vertexIndex;
  }
  if (a.type !== "VERTEX" && b.type !== "VERTEX") {
    return a.id === b.id;
  }
  return false;
}

function findHandleInSet(
  set: Set<SelectableHandle>,
  handle: SelectableHandle
): SelectableHandle | undefined {
  for (const h of set) {
    if (handleEquals(h, handle)) {
      return h;
    }
  }
  return undefined;
}

export interface SelectionSlice {
  selectedHandles: Set<SelectableHandle>;
  isSelected: (handle: SelectableHandle) => boolean;
  select: (handle: SelectableHandle) => void;
  deselect: (handle: SelectableHandle) => void;
  toggleSelection: (handle: SelectableHandle) => void;
  selectOnly: (handle: SelectableHandle) => void;
  selectMultiple: (handles: SelectableHandle[]) => void;
  clearSelection: () => void;
  getSelectedCount: () => number;
  editingPolylineId: PolylineId | null;
  setEditingPolylineId: (id: PolylineId | null) => void;
}

export const createSelectionSlice: StateCreator<SelectionSlice> = (
  set,
  get
) => ({
  selectedHandles: new Set<SelectableHandle>(),
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
  editingPolylineId: null,
  setEditingPolylineId: (id) => set({ editingPolylineId: id }),
});
