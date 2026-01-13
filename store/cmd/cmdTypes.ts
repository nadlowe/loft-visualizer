import { Vec2 } from "@/lib/geom/geomTypes";

export type DrawPolylineCmd = {
  type: "DRAW_POLYLINE";
  vertices: Vec2[];
  closeLoop: boolean;
};

export type LoftCmdType = "SEAM_AT_START" | "BEST_SEAM";

export type AddLoftCmd = {
  type: "ADD_LOFT";
  loftType: LoftCmdType;
};

export type Cmd = DrawPolylineCmd | AddLoftCmd;
