import { createWithEqualityFn } from "zustand/traditional";
import { CmdSlice, createCmdSlice } from "./cmd/cmdSlice";
import { createDocSlice, DocSlice } from "./docSlice";
import { createSelectionSlice, SelectionSlice } from "./selectionSlice";
import { createSnapSlice, GridSnapMode, SnapSlice } from "./snapSlice";

export type { GridSnapMode };

type AppState = DocSlice & SelectionSlice & CmdSlice & SnapSlice;

export const useStore = createWithEqualityFn<AppState>()((...a) => ({
  ...createDocSlice(...a),
  ...createSelectionSlice(...a),
  ...createCmdSlice(...a),
  ...createSnapSlice(...a),
}));
