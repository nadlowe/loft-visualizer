import { StateCreator } from "zustand";

export interface SnapSlice {
  snapEnabled: boolean;
  toggleSnap: () => void;
}

export const createSnapSlice: StateCreator<SnapSlice, [], [], SnapSlice> = (
  set
) => ({
  snapEnabled: false,
  toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),
});
