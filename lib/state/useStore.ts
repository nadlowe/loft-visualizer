import { create } from "zustand";
import { CmdSlice, createCmdSlice } from "./cmdSlice";
import { createDocSlice, DocSlice } from "./docSlice";
import { createSelectionSlice, SelectionSlice } from "./selectionSlice";

export type AppState = DocSlice & SelectionSlice & CmdSlice;

export const useStore = create<AppState>((...a) => ({
  ...createDocSlice(...a),
  ...createSelectionSlice(...a),
  ...createCmdSlice(...a),
}));
