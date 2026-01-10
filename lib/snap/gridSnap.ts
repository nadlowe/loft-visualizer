import { GridSnapMode } from "../state/snapSlice";

// Grid sizes in world units (1 unit = 1 inch)
const GRID_SIZE: Record<GridSnapMode, number> = {
  OFF: 0,
  INCH: 1,
  FOOT: 12,
  "10_FEET": 120,
};

export function gridSnap(
  x: number,
  y: number,
  mode: GridSnapMode
): { x: number; y: number } {
  if (mode === "OFF") {
    return { x, y };
  }

  const gridSize = GRID_SIZE[mode];
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize,
  };
}
