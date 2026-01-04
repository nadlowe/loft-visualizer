"use client";

import { handleNew } from "@/lib/entity/handle";
import { EntityHandle } from "@/lib/entity/handleTypes";
import { plane3New } from "@/lib/geom/plane3";
import { Doc } from "@/lib/state/doc";
import { useStore } from "@/lib/state/useStore";
import { EntityId, LoftId, PolylineId, uid, WorkPlaneId } from "@/lib/util/uid";
import { useRef, useState } from "react";
import { LoftIcon, PolylineIcon, WorkPlaneIcon } from "../Icons";
import { EntityCategory } from "./EntityCategory";

interface EntityMenuProps {
  doc: Doc;
}

export function EntityMenu({ doc }: EntityMenuProps) {
  const {
    isSelected,
    selectOnly,
    toggleSelection,
    selectMultiple,
    startDrawPolyline,
    addWorkPlane,
    startAddLoft,
    duplicateEntity,
    deleteEntity,
  } = useStore();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["workPlanes", "polylines", "lofts"])
  );
  const lastSelectedRef = useRef<EntityHandle | null>(null);

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

  const allEntityHandles: EntityHandle[] = [
    ...workPlaneEntries.map(([id]) =>
      handleNew("WORKPLANE", id as WorkPlaneId)
    ),
    ...polylineEntries.map(([id]) => handleNew("POLYLINE", id as PolylineId)),
    ...loftEntries.map(([id]) => handleNew("LOFT", id as LoftId)),
  ];

  const handleEntityClick = (
    e: React.MouseEvent,
    type: "WORKPLANE" | "POLYLINE" | "LOFT",
    id: string
  ) => {
    e.stopPropagation();
    const handle = handleNew(type, id as EntityId);

    if (e.shiftKey && lastSelectedRef.current) {
      const anchorIndex = allEntityHandles.indexOf(lastSelectedRef.current);
      const currentIndex = allEntityHandles.indexOf(handle);
      if (anchorIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(anchorIndex, currentIndex);
        const end = Math.max(anchorIndex, currentIndex);
        const range = allEntityHandles.slice(start, end + 1);
        selectMultiple(range);
      } else {
        selectOnly(handle);
        lastSelectedRef.current = handle;
      }
    } else if (e.metaKey || e.ctrlKey) {
      toggleSelection(handle);
      lastSelectedRef.current = handle;
    } else {
      selectOnly(handle);
      lastSelectedRef.current = handle;
    }
  };

  const handleAddWorkPlane = () => {
    const workPlaneId = uid<WorkPlaneId>();
    const workPlaneCount = Object.keys(doc.workPlanes).length;
    const newWorkPlane = {
      id: workPlaneId,
      type: "WORKPLANE" as const,
      name: `Work Plane ${workPlaneCount + 1}`,
      plane3: plane3New([0, 0, 0], [0, 0, 1]),
    };
    addWorkPlane(newWorkPlane);
    const handle = handleNew("WORKPLANE", workPlaneId);
    selectOnly(handle);
  };

  const handleAddPolyline = () => {
    startDrawPolyline();
  };

  const handleAddLoft = () => {
    startAddLoft();
  };

  const handleDuplicate = (handle: EntityHandle) => {
    const newHandle = duplicateEntity(handle);
    if (newHandle) {
      selectOnly(newHandle);
    }
  };

  const handleDelete = (handle: EntityHandle) => {
    deleteEntity(handle);
  };

  return (
    <div className="flex flex-col">
      <EntityCategory
        title="Work Planes"
        icon={WorkPlaneIcon}
        entries={workPlaneEntries}
        entityType="WORKPLANE"
        isExpanded={expandedCategories.has("workPlanes")}
        onToggle={() => toggleCategory("workPlanes")}
        onEntityClick={handleEntityClick}
        isSelected={isSelected}
        idCaster={(id) => id as WorkPlaneId}
        onAdd={handleAddWorkPlane}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />
      <EntityCategory
        title="Polylines"
        icon={PolylineIcon}
        entries={polylineEntries}
        entityType="POLYLINE"
        isExpanded={expandedCategories.has("polylines")}
        onToggle={() => toggleCategory("polylines")}
        onEntityClick={handleEntityClick}
        isSelected={isSelected}
        idCaster={(id) => id as PolylineId}
        onAdd={handleAddPolyline}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />
      <EntityCategory
        title="Lofts"
        icon={LoftIcon}
        entries={loftEntries}
        entityType="LOFT"
        isExpanded={expandedCategories.has("lofts")}
        onToggle={() => toggleCategory("lofts")}
        onEntityClick={handleEntityClick}
        isSelected={isSelected}
        idCaster={(id) => id as LoftId}
        onAdd={handleAddLoft}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />
    </div>
  );
}
