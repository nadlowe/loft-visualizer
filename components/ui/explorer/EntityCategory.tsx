"use client";

import { handleNew } from "@/lib/entity/handle";
import { EntityHandle } from "@/lib/entity/handleTypes";
import { EntityId } from "@/lib/util/uid";
import { cn } from "@/lib/utils";
import { colors } from "../../colors";
import { fonts } from "../../fonts";
import { EditableEntityName } from "../EditableEntityName";
import { DuplicateIcon, TrashIcon } from "../Icons";

interface EntityCategoryProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  entries: [string, { name: string }][];
  entityType: "WORKPLANE" | "POLYLINE" | "LOFT";
  isExpanded: boolean;
  onToggle: () => void;
  onEntityClick: (
    e: React.MouseEvent,
    type: "WORKPLANE" | "POLYLINE" | "LOFT",
    id: string
  ) => void;
  isSelected: (handle: EntityHandle) => boolean;
  idCaster: (id: string) => EntityId;
  onAdd?: () => void;
  onDuplicate?: (handle: EntityHandle) => void;
  onDelete?: (handle: EntityHandle) => void;
}

export function EntityCategory({
  title,
  icon: Icon,
  entries,
  entityType,
  isExpanded,
  onToggle,
  onEntityClick,
  isSelected,
  idCaster,
  onAdd,
  onDuplicate,
  onDelete,
}: EntityCategoryProps) {
  return (
    <div>
      <div
        className={cn(
          "flex w-full items-center gap-2 px-2 py-1.5 transition-colors",
          colors.text.primary
        )}
      >
        <button
          onClick={onToggle}
          className={cn(
            "flex flex-1 items-center gap-2 text-left transition-colors",
            "hover:" + colors.bg.secondary
          )}
        >
          <Icon className="h-4 w-4" />
          <span className={cn(fonts.menu)}>{title}</span>
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
        {onAdd && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className={cn(
              "flex items-center justify-center rounded p-0.5 transition-colors",
              "hover:" + colors.bg.secondary
            )}
            title={`Add ${title.slice(0, -1)}`}
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
        )}
      </div>
      {isExpanded && (
        <div className="ml-6 flex flex-col">
          {entries.map(([id, entity]) => {
            const handle = handleNew(entityType, idCaster(id));
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
                  onClick={(e) => onEntityClick(e, entityType, id)}
                  className={cn(
                    "flex-1 text-left transition-colors",
                    "hover:" + colors.text.primary,
                    "cursor-pointer"
                  )}
                >
                  <EditableEntityName handle={handle} />
                </button>
                <div className="flex items-center gap-1">
                  {onDuplicate && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate(handle);
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
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(handle);
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
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
