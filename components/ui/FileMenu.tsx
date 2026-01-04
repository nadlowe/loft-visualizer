"use client";

import { useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { colors } from "../colors";
import { fonts } from "../fonts";

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

interface FileMenuProps {
  onLoadDialogOpen: () => void;
  onDeleteDialogOpen: () => void;
}

export function FileMenu({ onLoadDialogOpen, onDeleteDialogOpen }: FileMenuProps) {
  const { doc, saveDoc, newDoc, loadDoc, getSavedDocs } = useStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [savedDocs, setSavedDocs] = useState(getSavedDocs());
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

  const handleNewDoc = () => {
    newDoc();
    setIsMenuOpen(false);
  };

  const handleSave = () => {
    saveDoc();
    setSavedDocs(getSavedDocs());
    setIsMenuOpen(false);
  };

  const handleLoad = (docId: string) => {
    loadDoc(docId);
    setSavedDocs(getSavedDocs());
    setIsMenuOpen(false);
  };

  const handleLoadFile = () => {
    setSavedDocs(getSavedDocs());
    onLoadDialogOpen();
    setIsMenuOpen(false);
  };

  const handleDelete = () => {
    setSavedDocs(getSavedDocs());
    onDeleteDialogOpen();
    setIsMenuOpen(false);
  };

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
        File
      </button>

      {isMenuOpen && (
        <div
          className={cn(
            "absolute top-full left-0 z-50 mt-1 w-56 rounded-lg border py-1 shadow-lg",
            colors.border.primary,
            colors.bg.primary
          )}
        >
          <button
            onClick={handleNewDoc}
            className={cn(
              "flex w-full items-center gap-2 px-4 py-2 text-left",
              fonts.menuItem,
              colors.text.primary,
              "hover:" + colors.bg.secondary
            )}
          >
            <span>New Document</span>
            <span
              className={cn("ml-auto", fonts.size.xs, colors.text.secondary)}
            >
              ⌘N
            </span>
          </button>

          <button
            onClick={handleSave}
            className={cn(
              "flex w-full items-center gap-2 px-4 py-2 text-left",
              fonts.menuItem,
              colors.text.primary,
              "hover:" + colors.bg.secondary
            )}
          >
            <span>Save</span>
            <span
              className={cn("ml-auto", fonts.size.xs, colors.text.secondary)}
            >
              ⌘S
            </span>
          </button>

          <button
            onClick={handleLoadFile}
            className={cn(
              "flex w-full items-center gap-2 px-4 py-2 text-left",
              fonts.menuItem,
              colors.text.primary,
              "hover:" + colors.bg.secondary
            )}
          >
            <span>Load</span>
            <span
              className={cn("ml-auto", fonts.size.xs, colors.text.secondary)}
            >
              ⌘O
            </span>
          </button>

          <button
            onClick={handleDelete}
            className={cn(
              "flex w-full items-center gap-2 px-4 py-2 text-left",
              fonts.menuItem,
              colors.text.primary,
              "hover:" + colors.bg.secondary
            )}
          >
            <span>Delete</span>
          </button>

          <div className={cn("my-1 border-t", colors.border.primary)} />

          {savedDocs.length > 0 && (
            <>
              <div
                className={cn(
                  "px-4 py-2",
                  fonts.menuLabel,
                  colors.text.secondary
                )}
              >
                Recent Documents
              </div>
              {savedDocs
                .sort((a, b) => b.savedAt - a.savedAt)
                .slice(0, 5)
                .map((savedDoc) => (
                  <button
                    key={savedDoc.id}
                    onClick={() => handleLoad(savedDoc.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-4 py-2 text-left",
                      fonts.menuItem,
                      "hover:" + colors.bg.secondary,
                      savedDoc.id === doc.id
                        ? cn(colors.bg.secondary, colors.text.selected)
                        : colors.text.primary
                    )}
                  >
                    <DocumentIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{savedDoc.name}</span>
                  </button>
                ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
