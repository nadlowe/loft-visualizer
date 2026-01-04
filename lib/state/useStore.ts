import { create } from "zustand";
import { createDocSlice, DocSlice } from "./docSlice";
import { createSelectionSlice, SelectionSlice } from "./selectionSlice";

export type AppState = DocSlice & SelectionSlice;

export const useStore = create<AppState>((...a) => ({
  ...createDocSlice(...a),
  ...createSelectionSlice(...a),
}));
