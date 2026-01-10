import { Vec2 } from "../../geom/geomTypes";

export type DrawPolylineCmd = {
  type: "DRAW_POLYLINE";
  vertices: Vec2[];
  closeLoop: boolean;
};

export type AddLoftCmd = {
  type: "ADD_LOFT";
};

export type Cmd = DrawPolylineCmd | AddLoftCmd;
