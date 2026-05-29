import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useCanvasState } from "../../context/CanvasContext";
import type { CardData } from "../../types";

function getCardCenter(card: CardData): { x: number; y: number } {
  return {
    x: card.position.x + card.size.width / 2,
    y: card.position.y + card.size.height / 2,
  };
}

function getEdgePoint(
  from: { x: number; y: number },
  to: { x: number; y: number },
  card: CardData
): { x: number; y: number } {
  const cx = card.position.x + card.size.width / 2;
  const cy = card.position.y + card.size.height / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return { x: cx, y: cy };

  const hw = card.size.width / 2;
  const hh = card.size.height / 2;

  const scaleX = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);

  return {
    x: cx + dx * scale,
    y: cy + dy * scale,
  };
}

const DRAW_DURATION_MS = 320;

export const ConnectorLines = memo(function ConnectorLines() {
  const { cards, connections, selectedCardId } = useCanvasState();

  const lines = useMemo(() => {
    const byId = new Map(cards.map((c) => [c.id, c]));
    return connections.flatMap((conn) => {
      const from = byId.get(conn.fromCardId);
      const to = byId.get(conn.toCardId);
      if (!from || !to) return [];

      const fromCenter = getCardCenter(from);
      const toCenter = getCardCenter(to);
      const start = getEdgePoint(fromCenter, toCenter, from);
      const end = getEdgePoint(toCenter, fromCenter, to);

      return [{ conn, start, end }];
    });
  }, [cards, connections]);

  // Track which connections are mid-draw so the first paint shows the line
  // tracing from source → target rather than appearing all at once.
  const seenRef = useRef<Set<string>>(new Set());
  const [drawingIds, setDrawingIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const fresh: string[] = [];
    for (const c of connections) {
      if (!seenRef.current.has(c.id)) fresh.push(c.id);
    }
    if (fresh.length === 0) {
      // Prune stale ids from the seen set when connections are removed
      const live = new Set(connections.map((c) => c.id));
      for (const id of Array.from(seenRef.current)) {
        if (!live.has(id)) seenRef.current.delete(id);
      }
      return;
    }
    for (const id of fresh) seenRef.current.add(id);
    setDrawingIds((prev) => {
      const next = new Set(prev);
      for (const id of fresh) next.add(id);
      return next;
    });
    const timer = window.setTimeout(() => {
      setDrawingIds((prev) => {
        const next = new Set(prev);
        for (const id of fresh) next.delete(id);
        return next;
      });
    }, DRAW_DURATION_MS + 40);
    return () => window.clearTimeout(timer);
  }, [connections]);

  return (
    <svg
      className="absolute inset-0 pointer-events-none select-none"
      style={{ overflow: "visible", width: 1, height: 1 }}
      aria-hidden="true"
    >
      {lines.map(({ conn, start, end }) => {
        const isSelected =
          selectedCardId === conn.fromCardId ||
          selectedCardId === conn.toCardId;
        const isDrawing = drawingIds.has(conn.id);
        const length = Math.hypot(end.x - start.x, end.y - start.y);

        const lineStyle: React.CSSProperties = isDrawing
          ? ({
            strokeDasharray: length,
            strokeDashoffset: 0,
            animation: `connector-draw ${DRAW_DURATION_MS}ms ease-out both`,
            // CSS var consumed by the @keyframes
            "--connector-len": `${length}`,
          } as React.CSSProperties)
          : {};

        return (
          <g key={conn.id}>
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={isSelected ? "var(--color-connector-active)" : "var(--color-connector)"}
              strokeWidth={isSelected ? 2 : 1}
              strokeDasharray={isDrawing ? undefined : isSelected ? "none" : "4 3"}
              style={lineStyle}
              className="transition-colors"
            />
            <circle
              cx={start.x}
              cy={start.y}
              r={3}
              fill="var(--color-connector)"
              className={isSelected ? "fill-accent" : ""}
            />
            <circle
              cx={end.x}
              cy={end.y}
              r={3}
              fill="var(--color-connector)"
              className={isSelected ? "fill-accent" : ""}
            />
          </g>
        );
      })}
    </svg>
  );
});
