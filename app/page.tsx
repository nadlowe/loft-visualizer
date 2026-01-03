"use client";

import { Canvas } from "@react-three/fiber";
import { useState, useRef } from "react";
import { cn } from "../lib/utils";
import { CameraController } from "../components/canvas/CameraController";
import { Scene } from "@/components/canvas/Scene";

export default function Home() {
  const [is2D, setIs2D] = useState(false);
  const controlsRef = useRef<any>(null);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-900">
      {/* Toggle button */}
      <button
        onClick={() => setIs2D(!is2D)}
        className={cn(
          "absolute top-4 right-4 z-10 rounded-md px-4 py-2 text-sm font-medium transition-colors",
          is2D
            ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        )}
      >
        {is2D ? "Switch to 3D" : "Switch to 2D"}
      </button>

      <div className="h-full w-full">
        <Canvas gl={{ antialias: true, alpha: false }}>
          <CameraController is2D={is2D} controlsRef={controlsRef} />
          <Scene is2D={is2D} controlsRef={controlsRef} />
        </Canvas>
      </div>
    </div>
  );
}
