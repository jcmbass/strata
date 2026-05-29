import { memo, useCallback, useMemo, useRef, useEffect } from "react";
import type { CardData, TechKey } from "../../types";
import { useCanvasDispatch, useCanvasState } from "../../context/CanvasContext";
import { generateId } from "../../utils/id";
import { detectTech, TECH_META } from "./cardTech";

interface CardProps {
  card: CardData;
}

const HEADER_HEIGHT = 44;
const FOOTER_HEIGHT = 28;
const TERMINAL_PADDING = 12;
const TERMINAL_LINE_HEIGHT = 16;
const MIN_TERMINAL_HEIGHT = 80;
const TERMINAL_FONT = '11px ui-monospace, Consolas, "Liberation Mono", monospace';

/* ── Hoisted static SVG elements ── */

const RUNNING_SPINNER = (
  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="40 60">
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
    </circle>
  </svg>
);

const SUCCESS_CHECK = (
  <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden>
    <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FAILED_X = (
  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

const PLAY_ICON = (
  <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden>
    <path d="M7 5l13 7-13 7V5z" fill="currentColor" />
  </svg>
);

/* ── StatusGlyph ── */

function StatusGlyph({
  state,
  color,
  onPlay,
}: {
  state: "idle" | "running" | "success" | "failed";
  color: string;
  onPlay: (e: React.MouseEvent) => void;
}) {
  if (state === "running") {
    return (
      <span
        className="inline-flex items-center justify-center size-6 rounded-md"
        style={{ background: `${color}22`, color }}
        aria-label="Running"
      >
        {RUNNING_SPINNER}
      </span>
    )
  }
  if (state === "success") {
    return (
      <span
        className="inline-flex items-center justify-center size-6 rounded-md bg-success/15 text-success"
        aria-label="Success"
      >
        {SUCCESS_CHECK}
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className="inline-flex items-center justify-center size-6 rounded-md bg-error/15 text-error" aria-label="Failed">
        {FAILED_X}
      </span>
    );
  }
  // idle → play button
  return (
    <button
      type="button"
      onClick={onPlay}
      onPointerDown={(e) => e.stopPropagation()}
      className="focus-ring inline-flex items-center justify-center size-6 rounded-md border border-card-border text-text-muted hover:text-accent hover:border-accent/40 hover:bg-accent/10 transition-colors duration-150"
      aria-label="Play stage"
      title="Play stage"
    >
      {PLAY_ICON}
    </button>
  );
}

export const Card = memo(function Card({ card }: CardProps) {
  const dispatch = useCanvasDispatch();
  const { viewport, selectedCardId, connectingFromId, queuedCardIds } = useCanvasState();
  const { id, position, size, title, connectedTo } = card;

  const tech: TechKey = card.tech ?? detectTech(title);
  const techMeta = TECH_META[tech];
  const runState = card.runState ?? "idle";
  const isQueued = false;

  const dragStartPos = useRef(position);

  const isSelected = selectedCardId === id;
  const isConnectingFrom = connectingFromId === id;
  const isConnectingTarget = connectingFromId !== null && connectingFromId !== id;

  const trySelectOrConnect = useCallback(() => {
    if (connectingFromId) {
      if (connectingFromId !== id) {
        dispatch({
          type: "ADD_CONNECTION",
          connection: {
            id: generateId(),
            fromCardId: connectingFromId,
            toCardId: id,
          },
        });
        dispatch({ type: "CANCEL_CONNECTING" });
      }
    } else {
      dispatch({ type: "SELECT_CARD", id });
    }
  }, [connectingFromId, id, dispatch]);

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-resize-handle]") || target.closest("button")) return;
      if (position.x !== dragStartPos.current.x || position.y !== dragStartPos.current.y) return;
      trySelectOrConnect();
    },
    [position, trySelectOrConnect]
  );

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        trySelectOrConnect();
      }
    },
    [trySelectOrConnect]
  );

  const handlePlay = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
    },
    []
  );
  return (
    <section
      className={`absolute rounded-xl border shadow-lg overflow-hidden transition-colors duration-150 ${isQueued ? "is-queued " : ""
        }${isSelected
          ? "border-accent bg-card-bg"
          : isConnectingFrom
            ? "border-success bg-card-bg ring-2 ring-success/40"
            : isConnectingTarget
              ? "border-accent/60 bg-card-bg cursor-crosshair"
              : "border-card-border bg-card-bg"
        }`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        animation: "card-appear 0.22s ease-out both",
      }}
      // Focusable so keyboard users can Tab to a card and select it (Enter/Space) —
      // see the onKeyDown handler. Justified for this interactive canvas widget.
      // oxlint-disable-next-line react-doctor/no-noninteractive-tabindex
      tabIndex={0}
      aria-label={`${title} pipeline stage (${techMeta.label}). ${connectedTo.length} connections. Status: ${runState}.`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      {/* Header — drag handle */}
      <div>
        <StatusGlyph state={card.runState ?? "idle"} color="#4F46E5" onPlay={handlePlay} />
      </div>

      {/* Terminal body — absolutely positioned rows so Pretext owns the layout */}

      {/* Footer */}
      <div>
        <span>Footer</span>
      </div>
    </section>
  );
});