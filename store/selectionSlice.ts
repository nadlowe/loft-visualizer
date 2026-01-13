import { SelectableHandle } from "@/lib/entity/handleTypes";
import { PolylineId } from "@/lib/util/uid";
import { StateCreator } from "zustand";

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
  lastSelectedHandle: SelectableHandle | null;
  isSelected: (handle: SelectableHandle) => boolean;
  select: (handle: SelectableHandle) => void;
  deselect: (handle: SelectableHandle) => void;
  toggleSelection: (handle: SelectableHandle) => void;
  selectOnly: (handle: SelectableHandle) => void;
  selectMultiple: (handles: SelectableHandle[]) => void;
  selectRange: (
    handles: SelectableHandle[],
    from: SelectableHandle,
    to: SelectableHandle
  ) => void;
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
  lastSelectedHandle: null,
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
    set({ selectedHandles: new Set([handle]), lastSelectedHandle: handle });
  },
  selectMultiple: (handles) => {
    set({ selectedHandles: new Set(handles) });
  },
  selectRange: (handles, from, to) => {
    const fromIdx = handles.findIndex((h) => handleEquals(h, from));
    const toIdx = handles.findIndex((h) => handleEquals(h, to));

    if (fromIdx === -1 || toIdx === -1) {
      set({ selectedHandles: new Set([to]), lastSelectedHandle: to });
      return;
    }

    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    const rangeHandles = handles.slice(start, end + 1);

    set({
      selectedHandles: new Set(rangeHandles),
      lastSelectedHandle: to,
    });
  },
  clearSelection: () => set({ selectedHandles: new Set() }),
  getSelectedCount: () => get().selectedHandles.size,
  editingPolylineId: null,
  setEditingPolylineId: (id) => set({ editingPolylineId: id }),
});
