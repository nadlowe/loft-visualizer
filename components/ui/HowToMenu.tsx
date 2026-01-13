"use client";

import { colors } from "@/components/colors";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { fonts } from "../fonts";

export function HowToMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isMenuOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={cn(
          "rounded px-3 py-1.5 transition-colors",
          fonts.menu,
          colors.text.primary,
          "hover:" + colors.bg.secondary,
          isMenuOpen && colors.bg.secondary
        )}
      >
        How To
      </button>

      {isMenuOpen && (
        <div
          className={cn(
            "absolute top-full left-0 z-50 mt-1 w-[640px] rounded-lg border py-2 shadow-lg max-h-[80vh] overflow-y-auto",
            colors.border.primary,
            colors.bg.primary
          )}
        >
          <div className="px-4 py-2 flex flex-col gap-4">
            {/* Section: Drawing */}
            <div>
              <div className={cn(fonts.menuLabel, colors.text.secondary, "mb-1")}>
                Drawing Polylines
              </div>
              <p className="text-xs leading-relaxed text-gray-400">
                Press <span className="text-gray-200">⌘P</span> to enter Draw Mode. 
                Double-click or press <span className="text-gray-200">Enter</span> to finish.
              </p>
            </div>

            {/* Section: Work Planes */}
            <div>
              <div className={cn(fonts.menuLabel, colors.text.secondary, "mb-1")}>
                Work Planes & 3D Positioning
              </div>
              <p className="text-xs leading-relaxed text-gray-400">
                Polylines are 2D shapes that exist on a <span className="text-gray-200">Work Plane</span>. To position a polyline in 3D space, assign it to a Work Plane in the Inspector. 
                Selecting a Work Plane reveals a movement widget: drag the <span className="text-gray-200">arrows</span> to translate along axes (default), or 
                hold <span className="text-gray-200">Shift</span> while dragging the arrows to <b>rotate</b> the plane in 3D. 
                All assigned polylines automatically move and rotate with their parent plane.
              </p>
            </div>

            {/* Section: Editing */}
            <div>
              <div className={cn(fonts.menuLabel, colors.text.secondary, "mb-1")}>
                Editing Polylines
              </div>
              <p className="text-xs leading-relaxed text-gray-400">
                • <span className="text-gray-200">Move:</span> Drag a polyline segment to slide it across its plane.<br/>
                • <span className="text-gray-200">Edit Vertices:</span> Double-click a polyline to enter Vertex Editing mode.<br/>
                • <span className="text-gray-200">Add Vertices:</span> While editing vertices, double-click an edge to insert a new vertex.<br/>
                • <span className="text-gray-200">Delete:</span> Select a vertex or polyline and press <span className="text-gray-200">Backspace</span>.
              </p>
            </div>

            {/* Section: Lofting */}
            <div>
              <div className={cn(fonts.menuLabel, colors.text.secondary, "mb-1")}>
                Creating Lofts
              </div>
              <p className="text-xs leading-relaxed text-gray-400">
                To create a loft, you can either select two polylines and then initiate a <span className="text-gray-200">Loft</span> command from the Explorer.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
