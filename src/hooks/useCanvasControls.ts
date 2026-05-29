import { useCallback, useRef } from "react";
import { useCanvasState, useCanvasDispatch } from "../context/CanvasContext";
import type { Position } from "../types";

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.1;

export function useCanvasControls() {
    const { viewport } = useCanvasState();
    const dispatch = useCanvasDispatch();
    const isPanning = useRef(false);
    const lastPointer = useRef<Position>({ x: 0, y: 0 });
    const spaceDown = useRef(false);

    const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

    const screenToCanvas = useCallback(
        (screen: Position): Position => ({
            x: (screen.x - viewport.offset.x) / viewport.scale,
            y: (screen.y - viewport.offset.y) / viewport.scale,
        }),
        [viewport]
    );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 1 || (e.button === 0 && spaceDown.current)) {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        isPanning.current = true;
        lastPointer.current = { x: e.clientX, y: e.clientY };
      }
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      dispatch({
        type: "SET_VIEWPORT_OFFSET",
        offset: {
          x: viewport.offset.x + dx,
          y: viewport.offset.y + dy,
        },
      });
    },
    [dispatch, viewport.offset]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isPanning.current) {
        isPanning.current = false;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
    },
    []
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const newScale = clampScale(viewport.scale + delta);

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const worldX = (mouseX - viewport.offset.x) / viewport.scale;
      const worldY = (mouseY - viewport.offset.y) / viewport.scale;

      const newOffsetX = mouseX - worldX * newScale;
      const newOffsetY = mouseY - worldY * newScale;

      dispatch({ type: "SET_VIEWPORT_SCALE", scale: newScale });
      dispatch({
        type: "SET_VIEWPORT_OFFSET",
        offset: { x: newOffsetX, y: newOffsetY },
      });
    },
    [dispatch, viewport]
  );

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.code === "Space") {
      e.preventDefault();
      spaceDown.current = true;
    }
  }, []);

  const onKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (e.code === "Space") {
      spaceDown.current = false;
    }
  }, []);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dispatch({ type: "SHOW_TOOLBAR", position: { x: e.clientX, y: e.clientY } });
    },
    [dispatch]
  );

  return {
    viewport,
    screenToCanvas,
    canvasTransform: `translate(${viewport.offset.x}px, ${viewport.offset.y}px) scale(${viewport.scale})`,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onWheel,
      onKeyDown,
      onKeyUp,
      onContextMenu,
    },
  };
}