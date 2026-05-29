import { useState, useCallback, useRef, useEffect, useMemo } from "react";

// ---------------------------------------------------------------------------
// Panel resize constants
// ---------------------------------------------------------------------------
const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 260;
const MAX_WIDTH = 540;

// ---------------------------------------------------------------------------
// Hint prompts shown on empty state
// ---------------------------------------------------------------------------
const HINTS = [
  "CI/CD pipeline for Node.js",
  "Docker + Kubernetes deploy",
  "GitHub Actions with tests",
];

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%] rounded-2xl rounded-tr-sm bg-accent/15 border border-accent/25 px-3 py-2">
        <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </p>
      </div>
    </div>
  );
}

export const ChatPanel = () => {
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [input, setInput] = useState("");

  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Panel resize handlers
  const onResizeDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      isResizing.current = true;
      startX.current = e.clientX;
      startWidth.current = panelWidth;
    },
    [panelWidth]
  );

  const onResizeMove = useCallback((e: React.PointerEvent) => {
    if (!isResizing.current) return;
    const next = Math.min(
      MAX_WIDTH,
      Math.max(MIN_WIDTH, startWidth.current + (startX.current - e.clientX))
    );
    setPanelWidth(next);
  }, []);

  const onResizeUp = useCallback((e: React.PointerEvent) => {
    if (isResizing.current) {
      isResizing.current = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, []);
  return (
    <aside className="absolute right-0 top-0 bottom-0 z-30 flex flex-col border-l border-card-border bg-canvas-elevated/95 backdrop-blur-sm"
      style={{ width: panelWidth }}
      aria-label="Strata Agent chat panel"
    >
      {/* Resize handle. role="separator" + aria-orientation is the standard
          ARIA pattern for a draggable split-pane divider; <hr> is a static
          thematic break and doesn't fit an interactive resizer. */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-accent/20 transition-colors z-10"
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
        aria-label="Resize panel"
        // oxlint-disable-next-line react-doctor/prefer-tag-over-role
        role="separator"
        aria-orientation="vertical"
        tabIndex={-1}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-card-border px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">Agent</span>
          <span className="text-xs text-text-muted">v0.1</span>
        </div>
        {status === "running" && (
          <button
            type="button"
            onClick={undefined}
            className="focus-ring text-xs text-text-muted hover:text-text-primary border border-card-border hover:border-accent/30 rounded-lg px-2 py-1 transition-colors duration-150"
            aria-label="Abort agent"
          >
            ✕ Stop
          </button>
        )}
      </div>
      
        <h2 className="text-lg font-bold mb-4">Activity Log</h2>
    </aside>
  );
}