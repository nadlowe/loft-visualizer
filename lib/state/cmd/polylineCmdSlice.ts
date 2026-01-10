import { StateCreator } from "zustand";
import { Vec2 } from "../../geom/geomTypes";
import { CmdSlice } from "./cmdSlice";

export type DrawPolylineCmd = {
  type: "DRAW_POLYLINE";
  vertices: Vec2[];
};

export interface PolylineCmdSlice {
  startDrawPolyline: () => void;
  addVertex: (vertex: Vec2) => void;
  removeLastVertex: () => void;
}

export const createPolylineCmdSlice: StateCreator<
  CmdSlice,
  [],
  [],
  PolylineCmdSlice
> = (set) => ({
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
});
