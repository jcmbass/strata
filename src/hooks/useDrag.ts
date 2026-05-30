import { useRef, useCallback } from "react";
import type { Position } from "../types";

interface DragState {
  isDragging: boolean;
  startPos: Position;
  startPointer: Position;
}

export function useDrag(onDragEnd: (pos: Position) => void, scale: number) {
  const drag = useRef<DragState>({
    isDragging: false,
    startPos: { x: 0, y: 0 },
    startPointer: { x: 0, y: 0 },
  });

  const onPointerDown = useCallback(
    (e: React.PointerEvent, currentPos: Position) => {
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = {
        isDragging: true,
        startPos: currentPos,
        startPointer: { x: e.clientX, y: e.clientY },
      };
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current.isDragging) return;
      const dx = (e.clientX - drag.current.startPointer.x) / scale;
      const dy = (e.clientY - drag.current.startPointer.y) / scale;
      onDragEnd({
        x: drag.current.startPos.x + dx,
        y: drag.current.startPos.y + dy,
      });
    },
    [onDragEnd, scale]
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (drag.current.isDragging) {
      drag.current.isDragging = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}
