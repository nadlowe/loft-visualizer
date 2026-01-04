"use client";

import { handleNew } from "@/lib/entity/handle";
import { EntityHandle } from "@/lib/entity/handleTypes";
import { EntityId } from "@/lib/util/uid";
import { cn } from "@/lib/utils";
import { colors } from "../../colors";
import { fonts } from "../../fonts";
import { EditableEntityName } from "../EditableEntityName";

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
}: EntityCategoryProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors",
          colors.text.primary,
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="ml-6 flex flex-col">
          {entries.map(([id, entity]) => {
            const handle = handleNew(entityType, idCaster(id));
            const selected = isSelected(handle);
            return (
              <button
                key={id}
                onClick={(e) => onEntityClick(e, entityType, id)}
                className={cn(
                  "rounded px-2 py-1 text-left text-sm transition-colors w-full",
                  selected ? colors.bg.selected : "",
                  "hover:" + colors.text.primary,
                  !selected && "hover:" + colors.bg.secondary,
                  "cursor-pointer"
                )}
              >
                <EditableEntityName handle={handle} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
