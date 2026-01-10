import { StateCreator } from "zustand";
import { AddLoftCmd, Cmd } from "./cmdTypes";

export interface LoftCmdSlice {
  startAddLoft: () => void;
}

export const createLoftCmdSlice: StateCreator<
  { cmd: Cmd | null },
  [],
  [],
  LoftCmdSlice
> = (set) => ({
  startAddLoft: () =>
    set({
      cmd: {
        type: "ADD_LOFT",
      } satisfies AddLoftCmd,
    }),
});
