import { StateCreator } from "zustand";
import { Vec2 } from "../geom/geomTypes";

export type DrawPolylineCmd = {
  type: "DRAW_POLYLINE";
  vertices: Vec2[];
};

export type AddLoftCmd = {
  type: "ADD_LOFT";
};

export type Cmd = DrawPolylineCmd | AddLoftCmd;

export interface CmdSlice {
  cmd: Cmd | null;
  startDrawPolyline: () => void;
  addVertex: (vertex: Vec2) => void;
  removeLastVertex: () => void;
  finishDrawPolyline: () => void;
  startAddLoft: () => void;
  finishAddLoft: () => void;
  cancelCmd: () => void;
}

export const createCmdSlice: StateCreator<CmdSlice> = (set, get) => ({
  cmd: null,
  startDrawPolyline: () =>
    set({
      cmd: {
        type: "DRAW_POLYLINE",
        vertices: [],
      },
    }),
  addVertex: (vertex) =>
    set((state) => {
      if (state.cmd?.type === "DRAW_POLYLINE") {
        return {
          cmd: {
            ...state.cmd,
            vertices: [...state.cmd.vertices, vertex],
          },
        };
      }
      return state;
    }),
  removeLastVertex: () =>
    set((state) => {
      if (
        state.cmd?.type === "DRAW_POLYLINE" &&
        state.cmd.vertices.length > 0
      ) {
        return {
          cmd: {
            ...state.cmd,
            vertices: state.cmd.vertices.slice(0, -1),
          },
        };
      }
      return state;
    }),
  finishDrawPolyline: () => set({ cmd: null }),
  startAddLoft: () =>
    set({
      cmd: {
        type: "ADD_LOFT",
      },
    }),
  finishAddLoft: () => set({ cmd: null }),
  cancelCmd: () => set({ cmd: null }),
});
