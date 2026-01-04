"use client";

import { getEntityFromHandle } from "@/lib/entity/entityUtils";
import { EntityHandle } from "@/lib/entity/handleTypes";
import { useStore } from "@/lib/state/useStore";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { colors } from "../colors";
import { fonts } from "../fonts";

interface EditableEntityNameProps {
  handle: EntityHandle;
  className?: string;
}

export function EditableEntityName({
  handle,
  className,
}: EditableEntityNameProps) {
  const { doc, updateEntity } = useStore();
  const entity = getEntityFromHandle(doc, handle);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(entity?.name || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (entity) {
      setName(entity.name);
    }
  }, [entity?.name]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (entity) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    saveName();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveName();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      if (entity) {
        setName(entity.name);
      }
    }
  };

  const saveName = () => {
    if (!entity || name.trim() === entity.name) {
      setIsEditing(false);
      return;
    }

    const trimmedName = name.trim();
    if (trimmedName === "") {
      setName(entity.name);
      setIsEditing(false);
      return;
    }

    updateEntity(handle, (entity) => ({
      ...entity,
      name: trimmedName,
    }));

    setIsEditing(false);
  };

  if (!entity) {
    return null;
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "border-none bg-transparent outline-none",
          fonts.weight.normal,
          fonts.size.sm,
          colors.text.secondary,
          className
        )}
        style={{ width: "100%" }}
      />
    );
  }

  return (
    <span
      onDoubleClick={handleDoubleClick}
      className={cn(
        fonts.weight.normal,
        fonts.size.sm,
        colors.text.secondary,
        "cursor-text",
        className
      )}
    >
      {entity.name}
    </span>
  );
}
