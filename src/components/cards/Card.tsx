import { memo, useCallback, useMemo, useRef, useEffect } from "react";
import type { CardData, TechKey } from "../../types";
import { useCanvasDispatch, useCanvasState } from "../../context/CanvasContext";
import { generateId } from "../../utils/id";
import { useLogReflow, type SourceLogLine } from "../../pretext/useLogReflow";
import { detectTech, TECH_META } from "./cardTech";
import { getTemplate, type LogLine } from "./cardLogs";
import { useCardRunner } from "./useCardRunner";

interface CardProps {
  card: CardData;
}

const HEADER_HEIGHT = 44;
const FOOTER_HEIGHT = 28;
const TERMINAL_PADDING = 12;
const TERMINAL_LINE_HEIGHT = 16;
const MIN_TERMINAL_HEIGHT = 80;
const TERMINAL_FONT = '11px ui-monospace, Consolas, "Liberation Mono", monospace';
// Width reserved for the accent `$` prompt + its trailing space on the cmd line.
// Hard-coded because the prompt glyph is always 1 char at 11px monospace.
const PROMPT_INDENT = 14;

function kindToClass(kind: LogLine["kind"]): string {
  switch (kind) {
    case "cmd":
      return "text-text-primary";
    case "info":
      return "text-text-secondary";
    case "dim":
      return "text-text-muted";
    case "success":
      return "text-success";
    case "warn":
      return "text-warning";
    case "error":
      return "text-error";
  }
}

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
  const { visibleLines, play } = useCardRunner(id, tech, runState, card.customLogs);

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

  // Compose the source lines the terminal should display. Logic:
  //  - Idle state: show only the cmd-preview line (so the user knows what
  //    will run) — derived from the agent override if any, otherwise from
  //    the tech template.
  //  - Running / success: show whatever the runner has streamed so far.
  //
  // The cmd-preview line is taken from card.customLogs[0] when the agent
  // gave us an override AND that line is kind="cmd"; otherwise we fall back
  // to the tech template's cmd. If customLogs has no cmd-kind first line
  // (the agent didn't include one), we suppress the `$` prompt entirely so
  // we don't fake a prompt the agent didn't author.
  const tplCmdText = getTemplate(tech).cmd;
  const previewCmd = useMemo<SourceLogLine<LogLine["kind"]> | null>(() => {
    const override = card.customLogs?.[0];
    if (override) {
      if (override.kind === "cmd") return { text: override.text, kind: "cmd" };
      // Custom logs that don't start with a cmd line — preview the first
      // line as-is (no `$` prompt) so the user still sees something.
      return { text: override.text, kind: override.kind };
    }
    return { text: tplCmdText, kind: "cmd" };
  }, [card.customLogs, tplCmdText]);

  const logSource = useMemo<SourceLogLine<LogLine["kind"]>[]>(() => {
    if (visibleLines.length === 0) {
      return previewCmd ? [previewCmd] : [];
    }
    return visibleLines.map((l) => ({ text: l.text, kind: l.kind }));
  }, [previewCmd, visibleLines]);

  // Only indent the first row if its source line is kind="cmd" (the `$`
  // overlay only renders in that case).
  const showPromptOverlay = logSource[0]?.kind === "cmd"; 
  const firstRowIndents = useMemo(
    () => (showPromptOverlay ? [PROMPT_INDENT] : []),
    [showPromptOverlay]
  );

  const terminalBodyWidth = Math.max(60, size.width - TERMINAL_PADDING * 2);
  const { rows, totalHeight: reflowHeight } = useLogReflow(
    logSource,
    TERMINAL_FONT,
    terminalBodyWidth,
    TERMINAL_LINE_HEIGHT,
    { firstRowIndents }
  )

  // Auto-scroll terminal to bottom when new lines arrive
  const terminalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [reflowHeight]);

  const terminalHeight = Math.max(MIN_TERMINAL_HEIGHT, size.height - HEADER_HEIGHT - FOOTER_HEIGHT);
  const durationLabel =
    runState === "success" && card.runDurationMs
      ? `${(card.runDurationMs / 1000).toFixed(2)}s`
      : runState === "running"
        ? "running…"
        : "idle";

  return (
    // A pipeline card is an intentionally selectable canvas widget living
    // inside role="application" (the canvas), where custom keyboard/pointer
    // interaction is expected. It can't be a single <button> because it
    // contains its own controls (play button, resize handles) — nesting
    // buttons is invalid — so it stays a labelled region that is Tab-focusable
    // and Enter/Space-selectable.
    // oxlint-disable-next-line react-doctor/no-noninteractive-element-interactions
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
      <div
        ref={terminalRef}
        className="scrollbar-floating font-mono text-[11px] leading-[16px] overflow-y-auto select-text relative"
        style={{
          height: terminalHeight,
          padding: TERMINAL_PADDING,
          background: "rgba(8, 10, 14, 0.55)",
        }}
      >
        <div>
          
        </div>
      </div>

      {/* Footer */}
      <div>
        <span>Footer</span>
      </div>
    </section>
  );
});