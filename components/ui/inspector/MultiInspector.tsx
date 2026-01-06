"use client";

import { getEntityFromHandle } from "@/lib/entity/entityTools";
import { EntityType } from "@/lib/entity/entityTypes";
import { parseHandle } from "@/lib/entity/handle";
import {
  EntityHandle,
  handleToHash,
  SelectableHandle,
  vertexHandleToHash,
} from "@/lib/entity/handleTypes";
import { Doc } from "@/lib/state/doc";
import { useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";
import { colors } from "../../colors";
import { fonts } from "../../fonts";
import { EditableEntityName } from "../EditableEntityName";
import { LoftIcon, PolylineIcon, WorkPlaneIcon } from "../Icons";

interface MultiInspectorProps {
  doc: Doc;
  handles: SelectableHandle[];
}

const typeIcons: Record<
  EntityType,
  React.ComponentType<{ className?: string }>
> = {
  WORKPLANE: WorkPlaneIcon,
  POLYLINE: PolylineIcon,
  LOFT: LoftIcon,
};

export function MultiInspector({ doc, handles }: MultiInspectorProps) {
  const { selectOnly } = useStore();

  // Separate entity handles and vertex handles
  const entityHandles = handles.filter(
    (h): h is EntityHandle => h.type !== "VERTEX"
  );
  const vertexHandles = handles.filter((h) => h.type === "VERTEX");

  const entities = entityHandles
    .map((handle) => {
      const entity = getEntityFromHandle(doc, handle);
      const { type } = parseHandle(handle);
      return entity ? { handle, entity, type } : null;
    })
    .filter(
      (item): item is { handle: EntityHandle; entity: any; type: EntityType } =>
        item !== null
    );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <span
          className={cn(
            fonts.weight.semibold,
            fonts.size.base,
            colors.text.primary
          )}
        >
          {handles.length} Selected
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {entities.map(({ handle, entity, type }) => {
          const Icon = typeIcons[type];
          return (
            <div
              key={handleToHash(handle)}
              onClick={() => selectOnly(handle)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition-colors",
                "hover:" + colors.bg.secondary
              )}
            >
              <Icon className={cn("h-4 w-4", colors.text.primary)} />
              <EditableEntityName handle={handle} />
            </div>
          );
        })}
        {vertexHandles.map((handle) => {
          if (handle.type !== "VERTEX") return null;
          const polyline = doc.polylines[handle.polylineId];
          const polylineName = polyline?.name || "Unknown";
          return (
            <div
              key={vertexHandleToHash(handle)}
              onClick={() => selectOnly(handle)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition-colors",
                "hover:" + colors.bg.secondary
              )}
            >
              <PolylineIcon className={cn("h-4 w-4", colors.text.primary)} />
              <span className={cn("text-sm", colors.text.primary)}>
                {polylineName} · Vertex {handle.vertexIndex + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
