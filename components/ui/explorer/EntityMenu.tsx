"use client";

import { EntityType } from "@/lib/entity/entityTypes";
import { entityTypeToDocField } from "@/lib/entity/entityTypeToDocField";
import { entityTypeToIcon } from "@/lib/entity/entityTypeToIcon";
import { entityTypeToName } from "@/lib/entity/entityTypeToName";
import { handleNew } from "@/lib/entity/handle";
import { Doc } from "@/lib/state/doc";
import { useStore } from "@/lib/state/useStore";
import { EntityId } from "@/lib/util/uid";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { colors } from "../../colors";
import { fonts } from "../../fonts";
import { EditableEntityName } from "../EditableEntityName";
import { DuplicateIcon, EyeIcon, EyeSlashIcon, TrashIcon } from "../Icons";

interface EntityMenuProps {
  doc: Doc;
  entityType: EntityType;
  onAdd: () => void;
}

export function EntityMenu({ doc, entityType, onAdd }: EntityMenuProps) {
  const {
    isSelected,
    selectOnly,
    toggleSelection,
    selectRange,
    lastSelectedHandle,
    selectedHandles,
    duplicateEntity,
    deleteEntity,
    setHidden,
  } = useStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const entries = Object.entries(doc[entityTypeToDocField[entityType]]) as [
    string,
    { name: string; hidden?: boolean },
  ][];

  const Icon = entityTypeToIcon[entityType];

  // Build handles array for range selection
  const handles = entries.map(([id]) => handleNew(entityType, id as EntityId));

  const handleEntityClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const handle = handleNew(entityType, id as EntityId);

    if (
      e.shiftKey &&
      lastSelectedHandle &&
      lastSelectedHandle.type === entityType
    ) {
      selectRange(handles, lastSelectedHandle, handle);
    } else if (e.metaKey || e.ctrlKey) {
      toggleSelection(handle);
    } else {
      selectOnly(handle);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex w-full items-center gap-2 px-2 py-1.5 transition-colors",
          colors.text.primary
        )}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "flex flex-1 items-center gap-2 text-left transition-colors",
            "hover:" + colors.bg.secondary
          )}
        >
          <Icon className="h-4 w-4" />
          <span className={cn(fonts.menu)}>{entityTypeToName[entityType]}</span>
          <svg
            className={cn(
              "ml-auto h-3 w-3 transition-transform",
              !isExpanded && "-rotate-90"
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          className={cn(
            "flex items-center justify-center rounded p-0.5 transition-colors",
            "hover:" + colors.bg.secondary
          )}
          title={`Add ${entityTypeToName[entityType].slice(0, -1)}`}
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>
      {isExpanded && (
        <div className="ml-6 flex flex-col">
          {entries.map(([id, entity]) => {
            const handle = handleNew(entityType, id as EntityId);
            const selected = isSelected(handle);
            return (
              <div
                key={id}
                className={cn(
                  "flex items-center gap-2 rounded px-2 py-1 text-sm transition-colors",
                  selected ? colors.bg.selected : "",
                  !selected && "hover:" + colors.bg.secondary
                )}
              >
                <button
                  onClick={(e) => handleEntityClick(e, id)}
                  className={cn(
                    "flex-1 text-left transition-colors",
                    "hover:" + colors.text.primary,
                    "cursor-pointer"
                  )}
                >
                  <EditableEntityName handle={handle} />
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newHidden = !entity.hidden;
                      // Apply to all selected handles plus this one
                      const handlesToUpdate = isSelected(handle)
                        ? Array.from(selectedHandles).filter(
                            (h) => h.type !== "VERTEX"
                          )
                        : [handle];
                      setHidden(handlesToUpdate as any[], newHidden);
                    }}
                    className={cn(
                      "flex items-center justify-center rounded p-0.5 transition-colors",
                      "hover:" + colors.bg.primary,
                      colors.text.secondary
                    )}
                    title={entity.hidden ? "Show" : "Hide"}
                  >
                    {entity.hidden ? (
                      <EyeSlashIcon className="h-3.5 w-3.5" />
                    ) : (
                      <EyeIcon className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateEntity(handle);
                    }}
                    className={cn(
                      "flex items-center justify-center rounded p-0.5 transition-colors",
                      "hover:" + colors.bg.primary,
                      colors.text.secondary
                    )}
                    title="Duplicate"
                  >
                    <DuplicateIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteEntity(handle);
                    }}
                    className={cn(
                      "flex items-center justify-center rounded p-0.5 transition-colors",
                      "hover:" + colors.bg.primary,
                      colors.text.secondary
                    )}
                    title="Delete"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
