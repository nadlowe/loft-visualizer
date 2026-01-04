"use client";

interface WindowSelectionOverlayProps {
  start: { x: number; y: number } | null;
  current: { x: number; y: number } | null;
  canvasRect: DOMRect | null;
}

export function WindowSelectionOverlay({
  start,
  current,
  canvasRect,
}: WindowSelectionOverlayProps) {
  if (!start || !current || !canvasRect) {
    return null;
  }

  const left = Math.min(start.x, current.x) - canvasRect.left;
  const top = Math.min(start.y, current.y) - canvasRect.top;
  const width = Math.abs(current.x - start.x);
  const height = Math.abs(current.y - start.y);

  return (
    <div
      className="pointer-events-none absolute border border-blue-500 bg-blue-500/10"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
}
