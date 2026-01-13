import { StateCreator } from "zustand";

export type GridSnapMode = "OFF" | "INCH" | "FOOT" | "10_FEET";

export interface SnapSlice {
  snapEnabled: boolean;
  gridSnapMode: GridSnapMode;
  cycleGridSnap: () => void;
  polylineClosedPref: boolean;
  setPolylineClosedPref: (closed: boolean) => void;
}

const GRID_SNAP_CYCLE: GridSnapMode[] = ["OFF", "INCH", "FOOT", "10_FEET"];

export const createSnapSlice: StateCreator<SnapSlice, [], [], SnapSlice> = (
  set
) => ({
  snapEnabled: true,
  gridSnapMode: "OFF",
  cycleGridSnap: () =>
    set((state) => {
      const currentIndex = GRID_SNAP_CYCLE.indexOf(state.gridSnapMode);
      const nextIndex = (currentIndex + 1) % GRID_SNAP_CYCLE.length;
      return { gridSnapMode: GRID_SNAP_CYCLE[nextIndex] };
    }),
  polylineClosedPref: false,
  setPolylineClosedPref: (closed) => set({ polylineClosedPref: closed }),
});
