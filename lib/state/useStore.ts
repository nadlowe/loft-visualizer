import { createWithEqualityFn } from "zustand/traditional";
import { CmdSlice, createCmdSlice } from "./cmd/cmdSlice";
import { createDocSlice, DocSlice } from "./docSlice";
import { createSelectionSlice, SelectionSlice } from "./selectionSlice";
import { createSnapSlice, GridSnapMode, SnapSlice } from "./snapSlice";

export type { GridSnapMode };

interface RenderSlice {
  renderKey: number;
  forceRender: () => void;
}

type AppState = DocSlice & SelectionSlice & CmdSlice & SnapSlice & RenderSlice;

export const useStore = createWithEqualityFn<AppState>()((...a) => ({
  ...createDocSlice(...a),
  ...createSelectionSlice(...a),
  ...createCmdSlice(...a),
  ...createSnapSlice(...a),
  renderKey: 0,
  forceRender: () => a[0]((state) => ({ renderKey: state.renderKey + 1 })),
}));
