import { StateCreator } from "zustand";
import { CmdSlice } from "./cmdSlice";

export type AddLoftCmd = {
  type: "ADD_LOFT";
};

export interface LoftCmdSlice {
  startAddLoft: () => void;
}

export const createLoftCmdSlice: StateCreator<
  CmdSlice,
  [],
  [],
  LoftCmdSlice
> = (set) => ({
  startAddLoft: () =>
    set({
      cmd: {
        type: "ADD_LOFT",
      },
    }),
});
