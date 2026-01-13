"use client";

import { colors } from "@/components/colors";
import { useShortcuts } from "@/hooks/useShortcuts";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { fonts } from "../fonts";

export function EditMenu() {
  const shortcuts = useShortcuts();
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
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
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
        Edit
      </button>

      {isMenuOpen && (
        <div
          className={cn(
            "absolute top-full left-0 z-50 mt-1 w-64 rounded-lg border py-1 shadow-lg",
            colors.border.primary,
            colors.bg.primary
          )}
        >
          {shortcuts
            .filter((s) => !s.hide)
            .map((shortcut) => (
              <button
                key={shortcut.id}
                onClick={() => {
                  shortcut.action();
                  setIsMenuOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-4 py-2 text-left",
                  fonts.menuItem,
                  colors.text.primary,
                  "hover:" + colors.bg.secondary
                )}
              >
                <span>{shortcut.name}</span>
                <span
                  className={cn(
                    "ml-auto",
                    fonts.size.xs,
                    colors.text.secondary
                  )}
                >
                  {shortcut.keyCombo}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
