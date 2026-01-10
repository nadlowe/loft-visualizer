import { StateCreator } from "zustand";

export interface SnapSlice {
  snapEnabled: boolean;
}

export const createSnapSlice: StateCreator<SnapSlice, [], [], SnapSlice> = () => ({
  snapEnabled: true,
});
