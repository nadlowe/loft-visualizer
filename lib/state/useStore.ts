import { createWithEqualityFn } from "zustand/traditional";
import { CmdSlice, createCmdSlice } from "./cmdSlice";
import { createDocSlice, DocSlice } from "./docSlice";
import { createSelectionSlice, SelectionSlice } from "./selectionSlice";
import { createSnapSlice, SnapSlice } from "./snapSlice";

export type AppState = DocSlice & SelectionSlice & CmdSlice & SnapSlice;

export const useStore = createWithEqualityFn<AppState>()((...a) => ({
  ...createDocSlice(...a),
  ...createSelectionSlice(...a),
  ...createCmdSlice(...a),
  ...createSnapSlice(...a),
}));
