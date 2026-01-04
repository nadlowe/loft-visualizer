"use client";

import { Scene } from "@/components/canvas/Scene";
import { colors } from "@/components/colors";
import { TopBar } from "@/components/ui/TopBar";
import { getCurrentDocId } from "@/lib/state/persistence";
import { useStore } from "@/lib/state/useStore";
import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { CameraController } from "../components/canvas/CameraController";
import { cn } from "../lib/utils";

export default function Home() {
  const [is2D, setIs2D] = useState(false);
  const controlsRef = useRef<any>(null);
  const { loadDoc } = useStore();

  useEffect(() => {
    const currentDocId = getCurrentDocId();
    if (currentDocId) {
      loadDoc(currentDocId);
    }
  }, [loadDoc]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-800">
      <TopBar />

      {/* Toggle button - adjust top position for top bar */}
      <button
        onClick={() => setIs2D(!is2D)}
        className={cn(
          "absolute top-16 right-4 z-10 rounded-md px-4 py-2 text-sm font-medium transition-colors",
          colors.bg.secondary,
          colors.text.primary,
          "hover:" + colors.bg.secondary
        )}
      >
        {is2D ? "Switch to 3D" : "Switch to 2D"}
      </button>

      {/* Canvas - adjust top margin for top bar */}
      <div className="h-full w-full pt-12">
        <Canvas gl={{ antialias: true, alpha: false }}>
          <CameraController is2D={is2D} controlsRef={controlsRef} />
          <Scene is2D={is2D} controlsRef={controlsRef} />
        </Canvas>
      </div>
    </div>
  );
}
