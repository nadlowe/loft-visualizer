import { StateCreator } from "zustand";

export interface SnapSlice {
  snapEnabled: boolean;
  setSnapEnabled: (enabled: boolean) => void;
  toggleSnap: () => void;
}

export const createSnapSlice: StateCreator<SnapSlice> = (set) => ({
  snapEnabled: false,
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),
});
