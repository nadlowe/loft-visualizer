"use client";

import { getEntityFromHandle } from "@/lib/entity/entityUtils";
import { parseHandle } from "@/lib/entity/handle";
import { EntityHandle } from "@/lib/entity/handleTypes";
import { Doc } from "@/lib/state/doc";
import { InspectorHeader } from "./InspectorHeader";

interface SingleInspectorProps {
  doc: Doc;
  handle: EntityHandle;
}

export function SingleInspector({ doc, handle }: SingleInspectorProps) {
  const entity = getEntityFromHandle(doc, handle);
  if (!entity) {
    return null;
  }

  const { type } = parseHandle(handle);
  return <InspectorHeader entity={entity} entityType={type} />;
}
