import { StateCreator } from "zustand";
import { SnapSlice } from "../snapSlice";
import { Cmd } from "./cmdTypes";
import { createLoftCmdSlice, LoftCmdSlice } from "./loftCmdSlice";
import { createPolylineCmdSlice, PolylineCmdSlice } from "./polylineCmdSlice";

export type { AddLoftCmd, Cmd, DrawPolylineCmd } from "./cmdTypes";

interface SharedCmdSlice {
  cmd: Cmd | null;
  cancelCmd: () => void;
  finishCmd: () => void;
}

export type CmdSlice = SharedCmdSlice & PolylineCmdSlice & LoftCmdSlice;

export const createCmdSlice: StateCreator<
  CmdSlice & SnapSlice,
  [],
  [],
  CmdSlice
> = (...a) => ({
  cmd: null,
  cancelCmd: () => a[0]({ cmd: null }),
  finishCmd: () => a[0]({ cmd: null }),
  ...createPolylineCmdSlice(...a),
  ...createLoftCmdSlice(...a),
});
