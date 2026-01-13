import { Vec2 } from "@/lib/geom/geomTypes";
import { StateCreator } from "zustand";
import { SnapSlice } from "../snapSlice";
import { Cmd, DrawPolylineCmd } from "./cmdTypes";

export interface PolylineCmdSlice {
  startDrawPolyline: () => void;
  addVertex: (vertex: Vec2) => void;
  removeLastVertex: () => void;
  setCloseLoop: (closeLoop: boolean) => void;
}

export const createPolylineCmdSlice: StateCreator<
  { cmd: Cmd | null } & SnapSlice,
  [],
  [],
  PolylineCmdSlice
> = (set, get) => ({
  startDrawPolyline: () =>
    set({
      cmd: {
        type: "DRAW_POLYLINE",
        vertices: [],
        closeLoop: get().polylineClosedPref,
      } satisfies DrawPolylineCmd,
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
  setCloseLoop: (closeLoop) =>
    set((state) => {
      if (state.cmd?.type === "DRAW_POLYLINE") {
        return {
          cmd: {
            ...state.cmd,
            closeLoop,
          },
        };
      }
      return state;
    }),
});
