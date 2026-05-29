import { useCallback, useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { useCanvasState, useCanvasDispatch } from "../../context/CanvasContext";
import { useAgentContext } from "../../agent/AgentProvider";
import { usePipelineRunner } from "../canvas/PipelineRunnerContext";
import { buildCommands, type CommandGroup, type PaletteCommand } from "./commands";

const GROUP_LABELS: Record<CommandGroup, string> = {
  stages: "Stages",
  pipeline: "Pipeline",
  agent: "Agent",
  tech: "Quick create",
};

const GROUP_ORDER: CommandGroup[] = ["stages", "pipeline", "agent", "tech"];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Toggle on Ctrl/Cmd+K from anywhere.
  // Registered in capture phase so we can swallow the event before other
  // window-level handlers (KeyboardShortcuts' Esc → deselect-card) see it
  // when the palette is the intended target.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  const { cards, selectedCardId } = useCanvasState();
  const canvasDispatch = useCanvasDispatch();
  const agent = useAgentContext();
  const runner = usePipelineRunner();

  const commands = useMemo<PaletteCommand[]>(() => {
    return buildCommands({
      hasSelection: selectedCardId !== null,
      selectedCardId,
      hasCards: cards.length > 0,
      addCard: (card) => canvasDispatch({ type: "ADD_CARD", card }),
      startConnecting: (id) => canvasDispatch({ type: "START_CONNECTING", fromId: id }),
      deleteCard: (id) => canvasDispatch({ type: "DELETE_CARD", id }),
      agentStatus: agent.status,
      abortAgent: agent.abort,
      clearAgentLog: agent.clearLog,
      focusAgentInput: () => {
        // Schedule focus after the palette closes so the textarea actually receives it.
        requestAnimationFrame(() => agent.inputRef.current?.focus());
      },
      runPipeline: runner.runAll,
      resetPipeline: runner.reset,
      isPipelineRunning: runner.isRunning,
      resetViewport: () => {
        canvasDispatch({ type: "SET_VIEWPORT_OFFSET", offset: { x: 0, y: 0 } });
        canvasDispatch({ type: "SET_VIEWPORT_SCALE", scale: 1 });
      },
    });
  }, [cards.length, selectedCardId, canvasDispatch, agent, runner]);

  const grouped = useMemo(() => {
    const m = new Map<CommandGroup, PaletteCommand[]>();
    for (const c of commands) {
      if (!m.has(c.group)) m.set(c.group, []);
      m.get(c.group)!.push(c);
    }
    return m;
  }, [commands]);

  if (!open) return null;

  return (
    // Backdrop click-to-close. The backdrop isn't focusable; Esc-to-close is
    // handled by the global keydown listener in this component's effect.
    // oxlint-disable-next-line react-doctor/click-events-have-key-events
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={close}
      // Modal dialog pattern. Native <dialog> would require imperative
      // showModal()/close() that conflicts with cmdk's controlled rendering.
      // oxlint-disable-next-line react-doctor/prefer-tag-over-role
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <Command
        label="Command palette"
        loop
        className="w-[min(560px,92vw)] rounded-2xl border border-card-border bg-canvas-elevated shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-card-border px-3.5 py-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="text-text-muted flex-shrink-0">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Type a command, search a stage, or pick a tech…"
            autoFocus
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="text-[10px] text-text-muted border border-card-border rounded px-1.5 py-0.5 select-none">
            Esc
          </kbd>
        </div>

        <Command.List className="scrollbar-floating max-h-[380px] overflow-y-auto p-1.5">
          <Command.Empty className="px-3 py-6 text-center text-xs text-text-muted">
            No commands match "{search}".
          </Command.Empty>

          {GROUP_ORDER.map((groupKey) => {
            const items = grouped.get(groupKey);
            if (!items || items.length === 0) return null;
            return (
              <Command.Group
                key={groupKey}
                heading={GROUP_LABELS[groupKey]}
                className="text-[10px] uppercase tracking-wider text-text-muted px-2 pt-2 pb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1"
              >
                {items.map((cmd) => (
                  <Command.Item
                    key={cmd.id}
                    value={`${cmd.label} ${cmd.keywords?.join(" ") ?? ""}`}
                    disabled={cmd.disabled}
                    onSelect={() => {
                      if (cmd.disabled) return;
                      cmd.run();
                      close();
                    }}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text-secondary aria-selected:bg-accent/15 aria-selected:text-text-primary data-[disabled=true]:opacity-40 data-[disabled=true]:cursor-not-allowed cursor-pointer transition-colors duration-100"
                  >
                    {cmd.accent ? (
                      <span
                        className="size-1.5 rounded-full flex-shrink-0"
                        style={{ background: cmd.accent }}
                        aria-hidden
                      />
                    ) : (
                      <span className="size-1.5 rounded-full bg-text-muted/30 flex-shrink-0" aria-hidden />
                    )}
                    <span className="flex-1 truncate">{cmd.label}</span>
                    {cmd.hint && (
                      <kbd className="text-[10px] text-text-muted border border-card-border rounded px-1.5 py-0.5 select-none flex-shrink-0">
                        {cmd.hint}
                      </kbd>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            );
          })}
        </Command.List>

        <div className="flex items-center justify-between border-t border-card-border bg-canvas/60 px-3 py-2 text-[10px] text-text-muted select-none">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="border border-card-border rounded px-1 py-0.5">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border border-card-border rounded px-1 py-0.5">↵</kbd> run
            </span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border border-card-border rounded px-1 py-0.5">⌘K</kbd> / <kbd className="border border-card-border rounded px-1 py-0.5">Ctrl K</kbd>
          </span>
        </div>
      </Command>
    </div>
  );
}
