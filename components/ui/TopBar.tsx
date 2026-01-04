"use client";

import { useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { colors } from "../colors";
import { fonts } from "../fonts";
import { FileMenu } from "./FileMenu";

export function TopBar() {
  const { doc, loadDoc, deleteDoc, getSavedDocs, transact } = useStore();
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [savedDocs, setSavedDocs] = useState(getSavedDocs());
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(doc.name);
  const loadDialogRef = useRef<HTMLDivElement>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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

    if (isLoadDialogOpen || isDeleteDialogOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isLoadDialogOpen, isDeleteDialogOpen]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    setEditedName(doc.name);
  }, [doc.name]);

  const handleNameDoubleClick = () => {
    setIsEditingName(true);
  };

  const handleNameSave = () => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== doc.name) {
      transact((currentDoc) => ({
        ...currentDoc,
        name: trimmedName,
      }));
    } else {
      setEditedName(doc.name);
    }
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setEditedName(doc.name);
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      handleNameCancel();
    }
  };

  const handleLoad = (docId: string) => {
    loadDoc(docId);
    setSavedDocs(getSavedDocs());
    setIsLoadDialogOpen(false);
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
    <div
      className={cn(
        "absolute top-0 right-0 left-0 z-50 flex h-12 items-center border-b px-4 shadow-sm",
        colors.border.primary,
        colors.bg.primary
      )}
    >
      {/* File menu button on the left */}
      <FileMenu
        onLoadDialogOpen={() => {
          setSavedDocs(getSavedDocs());
          setIsLoadDialogOpen(true);
        }}
        onDeleteDialogOpen={() => {
          setSavedDocs(getSavedDocs());
          setIsDeleteDialogOpen(true);
        }}
      />

      {/* Load File Dialog */}
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

      {/* Document name with icon - centered */}
      <div className="absolute left-1/2 flex -translate-x-1/2 transform items-center gap-2">
        <DocumentIcon
          className={cn("h-4 w-4 flex-shrink-0", colors.text.primary)}
        />
        {isEditingName ? (
          <input
            ref={inputRef}
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleNameKeyDown}
            className={cn(
              "min-w-[200px] rounded px-2 py-0.5 focus:outline-none",
              colors.border.input,
              colors.bg.input,
              fonts.input,
              colors.text.primary,
              "focus:" + colors.border.focus
            )}
          />
        ) : (
          <span
            onDoubleClick={handleNameDoubleClick}
            className={cn(
              "cursor-pointer transition-colors",
              fonts.documentName,
              colors.text.primary,
              "hover:" + colors.text.hover
            )}
          >
            {doc.name}
          </span>
        )}
      </div>
    </div>
  );
}

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
