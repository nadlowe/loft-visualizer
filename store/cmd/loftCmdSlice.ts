import { StateCreator } from "zustand";
import { AddLoftCmd, Cmd, LoftCmdType } from "./cmdTypes";

export interface LoftCmdSlice {
  startAddLoft: (loftType: LoftCmdType) => void;
}

export const createLoftCmdSlice: StateCreator<
  { cmd: Cmd | null },
  [],
  [],
  LoftCmdSlice
> = (set) => ({
  startAddLoft: (loftType: LoftCmdType) =>
    set({
      cmd: {
        type: "ADD_LOFT",
        loftType,
      } satisfies AddLoftCmd,
    }),
});
