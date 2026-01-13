import { useEffect, useState } from "react";
import { Polyline3, Vec3 } from "../geom/geomTypes";

interface DebugPolyline {
  id: string;
  polyline: Polyline3;
  color: string;
}

interface DebugPoint {
  id: string;
  point: Vec3;
  color: string;
  size: number;
}

let debugPolylines: DebugPolyline[] = [];
let debugPoints: DebugPoint[] = [];
const listeners: Set<() => void> = new Set();

// Defer listener notifications to avoid setState during render
function notifyListeners() {
  queueMicrotask(() => {
    listeners.forEach((fn) => fn());
  });
}

export function debugPolyline3s(
  polylines: Polyline3[],
  colors: string[] = ["#ff00ff"],
  ids?: string[]
) {
  polylines.forEach((polyline, index) => {
    debugPolyline3(polyline, colors[index], ids?.[index]);
  });
}

export function debugPolyline3(
  polyline: Polyline3,
  color: string = "#ff00ff",
  id?: string
): string {
  const idResolved = id ?? Math.random().toString(36).slice(2);
  const existing = id ? debugPolylines.findIndex((p) => p.id === id) : -1;
  if (existing >= 0) {
    debugPolylines[existing] = { id: idResolved, polyline, color };
  } else {
    debugPolylines.push({ id: idResolved, polyline, color });
  }
  notifyListeners();
  return idResolved;
}

export function clearDebugPolylines() {
  debugPolylines = [];
  notifyListeners();
}

export function removeDebugPolyline(id: string) {
  debugPolylines = debugPolylines.filter((p) => p.id !== id);
  notifyListeners();
}

export function useDebugPolylines(): DebugPolyline[] {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return debugPolylines;
}

// Vec3 point debugging
export function debugVec3(
  point: Vec3,
  color: string = "#ffff00",
  id?: string,
  size: number = 0.2
): string {
  const idResolved = id ?? Math.random().toString(36).slice(2);
  const existing = id ? debugPoints.findIndex((p) => p.id === id) : -1;
  if (existing >= 0) {
    debugPoints[existing] = { id: idResolved, point, color, size };
  } else {
    debugPoints.push({ id: idResolved, point, color, size });
  }
  notifyListeners();
  return idResolved;
}

export function debugVec3s(
  points: Vec3[],
  colors: string[] = ["#ffff00"],
  size: number = 0.2
) {
  points.forEach((point, index) => {
    debugVec3(point, colors[index] ?? colors[0], undefined, size);
  });
}

export function clearDebugPoints() {
  debugPoints = [];
  notifyListeners();
}

export function removeDebugPoint(id: string) {
  debugPoints = debugPoints.filter((p) => p.id !== id);
  notifyListeners();
}

export function useDebugPoints(): DebugPoint[] {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return debugPoints;
}

// Clear all debug visuals
export function clearAllDebug() {
  debugPolylines = [];
  debugPoints = [];
  notifyListeners();
}
