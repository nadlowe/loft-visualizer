"use client";

import { Scene } from "@/components/canvas/Scene";
import { Explorer } from "@/components/ui/Explorer";
import { Inspector } from "@/components/ui/Inspector";
import { ModeToggleButton } from "@/components/ui/ModeToggleButton";
import { TopBar } from "@/components/ui/TopBar";
import { getCurrentDocId } from "@/lib/state/persistence";
import { useStore } from "@/lib/state/useStore";
import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { CameraController } from "../components/canvas/CameraController";

export default function Home() {
  const [is2D, setIs2D] = useState(false);
  const controlsRef = useRef<any>(null);
  const { loadDoc } = useStore();

  const [explorerWidth, setExplorerWidth] = useState(250);
  const [inspectorWidth, setInspectorWidth] = useState(250);
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);

  useEffect(() => {
    const currentDocId = getCurrentDocId();
    if (currentDocId) {
      loadDoc(currentDocId);
    }
  }, [loadDoc]);

  const handleExplorerResize = (newWidth: number) => {
    const totalWidth = window.innerWidth;
    const minCenterWidth = 400;
    const inspectorActualWidth = isInspectorCollapsed ? 32 : inspectorWidth;
    const maxWidth = totalWidth - inspectorActualWidth - minCenterWidth;
    setExplorerWidth(Math.min(Math.max(newWidth, 200), maxWidth));
  };

  const handleInspectorResize = (newWidth: number) => {
    const totalWidth = window.innerWidth;
    const minCenterWidth = 400;
    const explorerActualWidth = isExplorerCollapsed ? 32 : explorerWidth;
    const maxWidth = totalWidth - explorerActualWidth - minCenterWidth;
    setInspectorWidth(Math.min(Math.max(newWidth, 200), maxWidth));
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-800">
      <TopBar />

      {/* Main content area with panels */}
      <div className="flex h-full pt-12">
        <Explorer
          width={explorerWidth}
          isCollapsed={isExplorerCollapsed}
          onResize={handleExplorerResize}
          onCollapse={setIsExplorerCollapsed}
        />

        {/* Canvas - flexible middle area */}
        <div className="relative flex-1 overflow-hidden">
          <ModeToggleButton is2D={is2D} onToggle={() => setIs2D(!is2D)} />

          <Canvas gl={{ antialias: true, alpha: false }}>
            <CameraController is2D={is2D} controlsRef={controlsRef} />
            <Scene is2D={is2D} controlsRef={controlsRef} />
          </Canvas>
        </div>

        <Inspector
          width={inspectorWidth}
          isCollapsed={isInspectorCollapsed}
          onResize={handleInspectorResize}
          onCollapse={setIsInspectorCollapsed}
        />
      </div>
    </div>
  );
}
