import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useAgentContext } from "../../agent/AgentProvider";
import type { AgentLogEntry, AgentStatus } from "../../agent/useAgent";

// ---------------------------------------------------------------------------
// Panel resize constants
// ---------------------------------------------------------------------------
const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 260;
const MAX_WIDTH = 540;

// ---------------------------------------------------------------------------
// Log entry grouping
// Pairs tool_call + tool_result by callId into a single "step" render group.
// ---------------------------------------------------------------------------
type RenderGroup =
  | { kind: "message"; entry: AgentLogEntry }
  | { kind: "step"; call: AgentLogEntry; result?: AgentLogEntry };

function groupEntries(log: AgentLogEntry[]): RenderGroup[] {
  const resultsByCallId = new Map<string, AgentLogEntry>();
  for (const e of log) {
    if (e.type === "tool_result" && e.callId) {
      resultsByCallId.set(e.callId, e);
    }
  }

  const groups: RenderGroup[] = [];
  const usedResultIds = new Set<string>();

  for (const entry of log) {
    if (entry.type === "tool_call") {
      const result = entry.callId ? resultsByCallId.get(entry.callId) : undefined;
      if (result) usedResultIds.add(result.id);
      groups.push({ kind: "step", call: entry, result });
    } else if (entry.type === "tool_result" && usedResultIds.has(entry.id)) {
      // Already consumed by its paired tool_call — skip
    } else {
      groups.push({ kind: "message", entry });
    }
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Hint prompts shown on empty state
// ---------------------------------------------------------------------------
const HINTS = [
  "CI/CD pipeline for Node.js",
  "Docker + Kubernetes deploy",
  "GitHub Actions with tests",
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: AgentStatus }) {
  if (status === "idle" || status === "done") return null;
  if (status === "running") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-accent font-medium transition-colors duration-200">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
        Running
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-error font-medium transition-colors duration-200">
      <span className="size-1.5 rounded-full bg-error" />
      Error
    </span>
  );
}

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

// Detects JSON-ops content that the fallback parser will absorb into a tool_call.
// We hide it from the chat so the user sees friendly status rows instead of raw JSON.
function looksLikeJsonOps(text: string): boolean {
  const t = text.trimStart();
  return t.startsWith("```") || t.startsWith("{") || /"ops"\s*:/.test(t.slice(0, 200));
}

function AssistantBubble({
  content,
  isStreaming,
  absorbed,
}: {
  content: string;
  isStreaming: boolean;
  /** True when a tool_call has already been synthesized for this content — hide entirely. */
  absorbed: boolean;
}) {
  const isJsonOps = content.length > 0 && looksLikeJsonOps(content);

  // Streaming finished AND ops were absorbed into a StepRow → render nothing
  if (absorbed && !isStreaming) return null;

  return (
    <div className="flex gap-2 items-start">
      <div className="mt-1 flex-shrink-0 size-5 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
        <span className="text-accent" style={{ fontSize: 12 }}>✦</span>
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        {isJsonOps ? (
          <p className="text-sm text-text-muted italic leading-relaxed flex items-center gap-1.5">
            Designing pipeline
            <span className="flex gap-0.5">
              <span className="size-1 rounded-full bg-text-muted animate-dot-pulse" style={{ animationDelay: "0ms" }} />
              <span className="size-1 rounded-full bg-text-muted animate-dot-pulse" style={{ animationDelay: "120ms" }} />
              <span className="size-1 rounded-full bg-text-muted animate-dot-pulse" style={{ animationDelay: "240ms" }} />
            </span>
          </p>
        ) : content ? (
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
            {content}
            {isStreaming && <span className="cursor-blink" />}
          </p>
        ) : (
          <span className="text-sm text-text-muted">
            {isStreaming ? (
              <span className="flex gap-0.5 items-center">
                <span className="size-1 rounded-full bg-text-muted animate-dot-pulse" style={{ animationDelay: "0ms" }} />
                <span className="size-1 rounded-full bg-text-muted animate-dot-pulse" style={{ animationDelay: "120ms" }} />
                <span className="size-1 rounded-full bg-text-muted animate-dot-pulse" style={{ animationDelay: "240ms" }} />
              </span>
            ) : null}
          </span>
        )}
      </div>
    </div>
  );
}

function StepRow({ call, result }: { call: AgentLogEntry; result?: AgentLogEntry }) {
  const isGetState = call.toolName === "get_state";
  const isPending = !result;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card-bg/40 border border-card-border/40 text-xs font-mono">
      <span className={`flex-shrink-0 text-[11px] ${isGetState ? "text-text-muted" : "text-accent/70"}`}>
        {isGetState ? "⊙" : "⚡"}
      </span>
      <span className="text-text-muted flex-1 truncate">{call.content}</span>
      {isPending ? (
        <span className="flex gap-0.5 flex-shrink-0">
          {[0, 120, 240].map((d) => (
            <span
              key={d}
              className="size-0.5 rounded-full bg-text-muted animate-dot-pulse"
              style={{ animationDelay: `${d}ms` }}
            />
          ))}
        </span>
      ) : (
        <span className={result!.success ? "text-success flex-shrink-0" : "text-error flex-shrink-0"}>
          {result!.success ? "✓" : "✗"}
        </span>
      )}
      {result && result.content && (
        <span className="text-text-muted flex-shrink-0 truncate max-w-[80px]" title={result.content}>
          {result.content}
        </span>
      )}
    </div>
  );
}

function ErrorBubble({ content }: { content: string }) {
  return (
    <div className="rounded-lg border border-error/35 bg-error/8 px-3 py-2">
      <p className="text-xs text-error leading-relaxed">{content}</p>
    </div>
  );
}

function EmptyState({
  onHint,
  status,
}: {
  onHint: (hint: string) => void;
  status: AgentStatus;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5 text-center">
      
      <div className="space-y-1">
        <p className="text-sm font-semibold text-text-primary">Strata Agent</p>
        <p className="text-xs text-text-muted leading-relaxed">
          Describe a pipeline and watch it build on the canvas
        </p>
      </div>
      <div className="flex flex-col gap-1.5 w-full">
        {HINTS.map((hint) => (
          <button
            key={hint}
            type="button"
            onClick={() => onHint(hint)}
            className="focus-ring text-left text-xs text-text-muted hover:text-text-secondary border border-card-border hover:border-accent/30 hover:bg-accent/5 rounded-xl px-3 py-2 transition-colors duration-150"
          >
            {hint}
          </button>
        ))}
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

  const { status, log, submit, abort, inputRef } = useAgentContext();

  // Expose the textarea to the agent context so the command palette can focus it.
  useEffect(() => {
    inputRef.current = textareaRef.current;
    return () => {
      if (inputRef.current === textareaRef.current) inputRef.current = null;
    };
  }, [inputRef]);

  // Auto-scroll to bottom when log updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  // Auto-resize textarea + toggle overflow so the floating scrollbar only
  // appears when content actually exceeds the max height. With overflow:auto
  // always on, browsers (esp. on Linux) reserve a gutter even when empty.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, 120);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > 120 ? "auto" : "hidden";
  }, [input]);

  // Group log entries for rendering
  const groups = useMemo(() => groupEntries(log), [log]);

  // Is the last assistant entry still being streamed?
  const lastAssistantId = useMemo(() => {
    for (let i = log.length - 1; i >= 0; i--) {
      if (log[i].type === "assistant") return log[i].id;
    }
    return null;
  }, [log]);

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

  // Input submit
  const handleSubmit = useCallback(() => {
    const msg = input.trim();
    if (!msg || status === "running") return;
    setInput("");
    submit(msg);
  }, [input, status, submit]);

  const handleHint = useCallback(
    (hint: string) => {
      if (status === "running") return;
      submit(hint);
    },
    [status, submit]
  );

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
      {/* Message list */}
      <div className="scrollbar-floating flex-1 overflow-y-auto p-3 space-y-3 scroll-smooth">
        {log.length === 0 ? (
          <EmptyState onHint={handleHint} status={status} />
        ) : (
          <>
            {groups.map((group) => {
              if (group.kind === "step") {
                return <StepRow key={group.call.id} call={group.call} result={group.result} />;
              }
              const { entry } = group;
              if (entry.type === "user") {
                return <UserBubble key={entry.id} content={entry.content} />;
              }
              if (entry.type === "assistant") {
                const isActive = status === "running" && entry.id === lastAssistantId;
                // Was this assistant's JSON content absorbed by an apply_canvas_ops tool_call later in the log?
                const idx = log.findIndex((e) => e.id === entry.id);
                const absorbed = log
                  .slice(idx + 1)
                  .some((e) => e.type === "tool_call" && e.toolName === "apply_canvas_ops");
                return (
                  <AssistantBubble
                    key={entry.id}
                    content={entry.content}
                    isStreaming={isActive}
                    absorbed={absorbed}
                  />
                );
              }
              if (entry.type === "error") {
                return <ErrorBubble key={entry.id} content={entry.content} />;
              }
              return null;
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>
      <h2 className="text-lg font-bold mb-4">Activity Log</h2>
    </aside>
  );
}