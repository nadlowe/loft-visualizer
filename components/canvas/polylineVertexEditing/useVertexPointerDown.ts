import type { VertexHandle } from "@/lib/entity/handleTypes";
import { PolylineEntity } from "@/lib/entity/polylineEntity";
import { PolylineId } from "@/lib/util/uid";
import { useStore } from "@/store/useStore";
import { useCallback } from "react";

interface UseVertexPointerDownProps {
  polylineId: PolylineId;
  polyline: PolylineEntity | undefined;
  isClickingVertexRef: React.MutableRefObject<boolean>;
  clickStartPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
  selectOnly: ReturnType<typeof useStore.getState>["selectOnly"];
  select: ReturnType<typeof useStore.getState>["select"];
  deselect: ReturnType<typeof useStore.getState>["deselect"];
  isSelected: ReturnType<typeof useStore.getState>["isSelected"];
}

export function useVertexPointerDown({
  polylineId,
  polyline,
  isClickingVertexRef,
  clickStartPosRef,
  selectOnly,
  select,
  deselect,
  isSelected,
}: UseVertexPointerDownProps) {
  return useCallback(
    (
      vertexIndex: number,
      e: {
        clientX: number;
        clientY: number;
        shiftKey: boolean;
        nativeEvent?: {
          clientX: number;
          clientY: number;
          shiftKey: boolean;
        };
      }
    ) => {
      isClickingVertexRef.current = true;
      requestAnimationFrame(() => {
        isClickingVertexRef.current = false;
      });

      clickStartPosRef.current = {
        x: e.clientX ?? e.nativeEvent?.clientX,
        y: e.clientY ?? e.nativeEvent?.clientY,
      };

      const vertexHandle: VertexHandle = {
        type: "VERTEX",
        polylineId,
        vertexIndex,
      };

      // Check if this is a linked vertex (first or last of closed polyline)
      const vertexCount = polyline
        ? Math.floor(polyline.polyline.length / 2)
        : 0;
      const lastIdx = vertexCount - 1;
      const isLinkedVertex =
        polyline?.closed &&
        vertexCount >= 2 &&
        (vertexIndex === 0 || vertexIndex === lastIdx);
      const linkedIndex = vertexIndex === 0 ? lastIdx : 0;
      const linkedHandle: VertexHandle | null = isLinkedVertex
        ? { type: "VERTEX", polylineId, vertexIndex: linkedIndex }
        : null;

      const shiftKey = e.shiftKey ?? e.nativeEvent?.shiftKey;
      if (shiftKey) {
        if (isSelected(vertexHandle)) {
          deselect(vertexHandle);
          if (linkedHandle) deselect(linkedHandle);
        } else {
          select(vertexHandle);
          if (linkedHandle) select(linkedHandle);
        }
      } else {
        selectOnly(vertexHandle);
        if (linkedHandle) select(linkedHandle);
      }
    },
    [
      polylineId,
      polyline,
      isClickingVertexRef,
      clickStartPosRef,
      selectOnly,
      select,
      deselect,
      isSelected,
    ]
  );
}
