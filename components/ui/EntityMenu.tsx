"use client";

import { Doc } from "@/lib/state/doc";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { colors } from "../colors";
import { fonts } from "../fonts";
import { LoftIcon, PolylineIcon, WorkPlaneIcon } from "./Icons";

interface EntityMenuProps {
  doc: Doc;
}

export function EntityMenu({ doc }: EntityMenuProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["workPlanes", "polylines", "lofts"])
  );

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const workPlaneEntries = Object.entries(doc.workPlanes);
  const polylineEntries = Object.entries(doc.polylines);
  const loftEntries = Object.entries(doc.lofts);

  return (
    <div className="flex flex-col">
      {/* Work Planes */}
      <div>
        <button
          onClick={() => toggleCategory("workPlanes")}
          className={cn(
            "flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors",
            colors.text.primary,
            "hover:" + colors.bg.secondary
          )}
        >
          <WorkPlaneIcon className="h-4 w-4" />
          <span className={cn(fonts.menu)}>Work Planes</span>
          <svg
            className={cn(
              "ml-auto h-3 w-3 transition-transform",
              !expandedCategories.has("workPlanes") && "-rotate-90"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
        {expandedCategories.has("workPlanes") && (
          <div className="ml-6 flex flex-col">
            {workPlaneEntries.map(([id, entity]) => (
              <div
                key={id}
                className={cn(
                  "px-2 py-1 text-sm transition-colors",
                  colors.text.secondary,
                  "hover:" + colors.text.primary,
                  "hover:" + colors.bg.secondary
                )}
              >
                {entity.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Polylines */}
      <div>
        <button
          onClick={() => toggleCategory("polylines")}
          className={cn(
            "flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors",
            colors.text.primary,
            "hover:" + colors.bg.secondary
          )}
        >
          <PolylineIcon className="h-4 w-4" />
          <span className={cn(fonts.menu)}>Polylines</span>
          <svg
            className={cn(
              "ml-auto h-3 w-3 transition-transform",
              !expandedCategories.has("polylines") && "-rotate-90"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
        {expandedCategories.has("polylines") && (
          <div className="ml-6 flex flex-col">
            {polylineEntries.map(([id, entity]) => (
              <div
                key={id}
                className={cn(
                  "px-2 py-1 text-sm transition-colors",
                  colors.text.secondary,
                  "hover:" + colors.text.primary,
                  "hover:" + colors.bg.secondary
                )}
              >
                {entity.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lofts */}
      <div>
        <button
          onClick={() => toggleCategory("lofts")}
          className={cn(
            "flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors",
            colors.text.primary,
            "hover:" + colors.bg.secondary
          )}
        >
          <LoftIcon className="h-4 w-4" />
          <span className={cn(fonts.menu)}>Lofts</span>
          <svg
            className={cn(
              "ml-auto h-3 w-3 transition-transform",
              !expandedCategories.has("lofts") && "-rotate-90"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
        {expandedCategories.has("lofts") && (
          <div className="ml-6 flex flex-col">
            {loftEntries.map(([id, entity]) => (
              <div
                key={id}
                className={cn(
                  "px-2 py-1 text-sm transition-colors",
                  colors.text.secondary,
                  "hover:" + colors.text.primary,
                  "hover:" + colors.bg.secondary
                )}
              >
                {entity.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
