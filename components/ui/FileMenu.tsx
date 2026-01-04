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

export function FileMenu() {
  const { doc, saveDoc, newDoc, loadDoc, deleteDoc, getSavedDocs } = useStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [savedDocs, setSavedDocs] = useState(getSavedDocs());
  const menuRef = useRef<HTMLDivElement>(null);
  const loadDialogRef = useRef<HTMLDivElement>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (
        loadDialogRef.current &&
        !loadDialogRef.current.contains(event.target as Node)
      ) {
        setIsLoadDialogOpen(false);
      }
      if (
        deleteDialogRef.current &&
        !deleteDialogRef.current.contains(event.target as Node)
      ) {
        setIsDeleteDialogOpen(false);
        setDocToDelete(null);
      }
    };

    if (isMenuOpen || isLoadDialogOpen || isDeleteDialogOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isMenuOpen, isLoadDialogOpen, isDeleteDialogOpen]);

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
    setIsLoadDialogOpen(false);
  };

  const handleLoadFile = () => {
    setSavedDocs(getSavedDocs());
    setIsLoadDialogOpen(true);
    setIsMenuOpen(false);
  };

  const handleDelete = () => {
    setSavedDocs(getSavedDocs());
    setIsDeleteDialogOpen(true);
    setIsMenuOpen(false);
  };

  const handleDeleteClick = (docId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDocToDelete(docId);
    setIsDeleteDialogOpen(true);
    setIsLoadDialogOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (docToDelete) {
      deleteDoc(docToDelete);
      setSavedDocs(getSavedDocs());
      if (docToDelete === doc.id) {
        setIsDeleteDialogOpen(false);
      }
      setDocToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDocToDelete(null);
    setIsDeleteDialogOpen(false);
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

      {/* Load Dialog */}
      {isLoadDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            ref={loadDialogRef}
            className={cn(
              "w-full max-w-md rounded-lg border shadow-xl",
              colors.border.primary,
              colors.bg.primary
            )}
          >
            <div className={cn("border-b px-6 py-4", colors.border.primary)}>
              <h2 className={cn(fonts.dialogTitle, colors.text.primary)}>
                Load
              </h2>
            </div>
            <div className="max-h-96 overflow-y-auto px-6 py-4">
              {savedDocs.length === 0 ? (
                <div className={cn("py-8 text-center", fonts.dialogEmpty)}>
                  No saved documents found
                </div>
              ) : (
                <div className="space-y-1">
                  {savedDocs
                    .sort((a, b) => b.savedAt - a.savedAt)
                    .map((savedDoc) => (
                      <div
                        key={savedDoc.id}
                        className={cn(
                          "flex items-center gap-3 rounded px-4 py-3 transition-colors",
                          savedDoc.id === doc.id
                            ? colors.bg.secondary
                            : "hover:" + colors.bg.secondary
                        )}
                      >
                        <button
                          onClick={() => handleLoad(savedDoc.id)}
                          className="flex flex-1 items-center gap-3 text-left"
                        >
                          <DocumentIcon
                            className={cn(
                              "h-5 w-5 flex-shrink-0",
                              savedDoc.id === doc.id
                                ? colors.text.selected
                                : colors.text.primary
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div
                              className={cn(
                                "truncate",
                                fonts.weight.medium,
                                savedDoc.id === doc.id
                                  ? colors.text.selected
                                  : colors.text.primary
                              )}
                            >
                              {savedDoc.name}
                            </div>
                            <div
                              className={cn(
                                fonts.size.xs,
                                colors.text.secondary
                              )}
                            >
                              {new Date(savedDoc.savedAt).toLocaleString()}
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(savedDoc.id, e)}
                          className={cn(
                            "rounded px-2 py-1 transition-colors",
                            fonts.size.xs,
                            colors.text.secondary,
                            "hover:" + colors.bg.deleteHover,
                            "hover:" + colors.text.delete
                          )}
                          title="Delete document"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div className={cn("border-t px-6 py-4", colors.border.primary)}>
              <button
                onClick={() => setIsLoadDialogOpen(false)}
                className={cn(
                  "rounded px-4 py-2 transition-colors",
                  fonts.button,
                  colors.text.primary,
                  "hover:" + colors.bg.secondary
                )}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            ref={deleteDialogRef}
            className={cn(
              "w-full max-w-md rounded-lg border shadow-xl",
              colors.border.primary,
              colors.bg.primary
            )}
          >
            <div className={cn("border-b px-6 py-4", colors.border.primary)}>
              <h2 className={cn(fonts.dialogTitle, colors.text.primary)}>
                Delete
              </h2>
            </div>
            <div className="max-h-96 overflow-y-auto px-6 py-4">
              {savedDocs.length === 0 ? (
                <div className={cn("py-8 text-center", fonts.dialogEmpty)}>
                  No saved documents found
                </div>
              ) : (
                <div className="space-y-1">
                  {savedDocs
                    .sort((a, b) => b.savedAt - a.savedAt)
                    .map((savedDoc) => (
                      <button
                        key={savedDoc.id}
                        onClick={() => setDocToDelete(savedDoc.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded px-4 py-3 text-left transition-colors",
                          docToDelete === savedDoc.id
                            ? cn(colors.bg.deleteSelected, colors.text.delete)
                            : savedDoc.id === doc.id
                              ? cn(colors.bg.secondary, colors.text.selected)
                              : cn(
                                  colors.text.primary,
                                  "hover:" + colors.bg.secondary
                                )
                        )}
                      >
                        <DocumentIcon
                          className={cn(
                            "h-5 w-5 flex-shrink-0",
                            docToDelete === savedDoc.id
                              ? colors.text.delete
                              : savedDoc.id === doc.id
                                ? colors.text.selected
                                : colors.text.primary
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className={cn("truncate", fonts.weight.medium)}>
                            {savedDoc.name}
                          </div>
                          <div
                            className={cn(fonts.size.xs, colors.text.secondary)}
                          >
                            {new Date(savedDoc.savedAt).toLocaleString()}
                          </div>
                        </div>
                        {docToDelete === savedDoc.id && (
                          <span
                            className={cn(fonts.size.xs, colors.text.delete)}
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>
            <div
              className={cn(
                "flex justify-end gap-3 border-t px-6 py-4",
                colors.border.primary
              )}
            >
              <button
                onClick={handleDeleteCancel}
                className={cn(
                  "rounded px-4 py-2 transition-colors",
                  fonts.button,
                  colors.text.primary,
                  "hover:" + colors.bg.secondary
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={!docToDelete}
                className={cn(
                  "rounded px-4 py-2 transition-colors",
                  fonts.button,
                  colors.text.primary,
                  docToDelete
                    ? cn(colors.bg.red, "hover:" + colors.bg.redHover)
                    : cn("cursor-not-allowed", colors.bg.gray)
                )}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
