"use client";

import { useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { colors } from "../colors";
import { fonts } from "../fonts";
import { FileMenu } from "./FileMenu";

export function TopBar() {
  const { doc, transact } = useStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(doc.name);
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div
      className={cn(
        "absolute top-0 right-0 left-0 z-50 flex h-12 items-center border-b px-4 shadow-sm",
        colors.border.primary,
        colors.bg.primary
      )}
    >
      {/* File menu button on the left */}
      <FileMenu />

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
              fonts.documentName,
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
