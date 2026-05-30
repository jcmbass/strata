import { useRef, useCallback } from "react";
import type { Size, Position } from "../types";

type Corner = "se" | "sw" | "ne" | "nw";

interface ResizeState {
  isResizing: boolean;
  corner: Corner;
  startSize: Size;
  startPos: Position;
  startPointer: Position;
}

export function useResize(
  onResize: (size: Size, position: Position) => void,
  scale: number
) {
  const state = useRef<ResizeState>({
    isResizing: false,
    corner: "se",
    startSize: { width: 0, height: 0 },
    startPos: { x: 0, y: 0 },
    startPointer: { x: 0, y: 0 },
  });

  const onPointerDown = useCallback(
    (e: React.PointerEvent, corner: Corner, currentSize: Size, currentPos: Position) => {
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      state.current = {
        isResizing: true,
        corner,
        startSize: currentSize,
        startPos: currentPos,
        startPointer: { x: e.clientX, y: e.clientY },
      };
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = state.current;
      if (!s.isResizing) return;
      const dx = (e.clientX - s.startPointer.x) / scale;
      const dy = (e.clientY - s.startPointer.y) / scale;

      let width = s.startSize.width;
      let height = s.startSize.height;
      let x = s.startPos.x;
      let y = s.startPos.y;

      if (s.corner === "se") {
        width = s.startSize.width + dx;
        height = s.startSize.height + dy;
      } else if (s.corner === "sw") {
        width = s.startSize.width - dx;
        height = s.startSize.height + dy;
        x = s.startPos.x + dx;
      } else if (s.corner === "ne") {
        width = s.startSize.width + dx;
        height = s.startSize.height - dy;
        y = s.startPos.y + dy;
      } else if (s.corner === "nw") {
        width = s.startSize.width - dx;
        height = s.startSize.height - dy;
        x = s.startPos.x + dx;
        y = s.startPos.y + dy;
      }

      width = Math.max(280, width);
      height = Math.max(160, height);

      onResize({ width, height }, { x, y });
    },
    [onResize, scale]
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (state.current.isResizing) {
      state.current.isResizing = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}
