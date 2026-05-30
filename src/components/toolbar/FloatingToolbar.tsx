import { useEffect, useCallback } from "react";
import { useCanvasState, useCanvasDispatch } from "../../context/CanvasContext";
import { generateId } from "../../utils/id";
import { useAgentContext } from "../../agent/AgentProvider";
import type { ToolbarAction, CardData, TechKey } from "../../types";

const ACTIONS: { action: ToolbarAction; label: string; shortcut: string }[] = [
    { action: "add-card", label: "Add Stage", shortcut: "A" },
    { action: "connect", label: "Connect", shortcut: "C" },
    { action: "ask-agent", label: "Edit Agent", shortcut: "R" },
    { action: "delete", label: "Delete", shortcut: "Del" },
];

const STAGE_PRESETS: { title: string; tech: TechKey }[] = [
    { title: "Checkout Code", tech: "github" },
    { title: "Install Dependencies", tech: "npm" },
    { title: "Run Tests", tech: "vitest" },
    { title: "Lint", tech: "eslint" },
    { title: "Build App", tech: "vite" },
    { title: "Build Image", tech: "docker" },
    { title: "Deploy to K8s", tech: "kubernetes" },
];

function createCard(x: number, y: number): CardData {
    const preset = STAGE_PRESETS[Math.floor(Math.random() * STAGE_PRESETS.length)];
    return {
        id: generateId(),
        position: { x, y },
        size: { width: 260, height: 200 },
        title: preset.title,
        connectedTo: [],
        tech: preset.tech,
        runState: "idle",
    };
}

export function FloatingToolbar() {
    const { toolbarVisible, toolbarPosition, selectedCardId, viewport, cards } =
        useCanvasState();
    const dispatch = useCanvasDispatch();
    const { setEditingCard, inputRef } = useAgentContext();

    const hide = useCallback(() => {
        dispatch({ type: "HIDE_TOOLBAR" });
    }, [dispatch]);

    useEffect(() => {
        if (!toolbarVisible) return;
        // Dispatch directly (its identity is stable) instead of closing over the
        // `hide` callback, so the listener isn't re-subscribed on every render.
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") dispatch({ type: "HIDE_TOOLBAR" });
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [toolbarVisible, dispatch]);

    if (!toolbarVisible || !toolbarPosition) return null;

    const canvasX = (toolbarPosition.x - viewport.offset.x) / viewport.scale;
    const canvasY = (toolbarPosition.y - viewport.offset.y) / viewport.scale;

    const handleAction = (action: ToolbarAction) => {
        if (action === "add-card") {
            dispatch({
                type: "ADD_CARD",
                card: createCard(canvasX - 60, canvasY),
            });
        } else if (action === "connect") {
            if (selectedCardId) {
                dispatch({ type: "START_CONNECTING", fromId: selectedCardId });
            }
        } else if (action === "ask-agent") {
            if (selectedCardId) {
                const card = cards.find((c) => c.id === selectedCardId);
                setEditingCard(selectedCardId, card?.title ?? null);
                // Focus the chat input so the user can type immediately
                inputRef.current?.focus();
            }
        } else if (action === "delete") {
            if (selectedCardId) {
                dispatch({ type: "DELETE_CARD", id: selectedCardId });
            }
        }
        hide();
    };

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={hide} aria-hidden="true" />
            <div
                className="fixed z-50 rounded-lg border border-toolbar-border bg-toolbar-bg/95 py-1.5 shadow-2xl backdrop-blur-sm"
                style={{ left: toolbarPosition.x, top: toolbarPosition.y }}
                role="menu"
                aria-label="Canvas actions"
            >
                {ACTIONS.map(({ action, label, shortcut }) => {
                    const disabled =
                        (action === "delete" && !selectedCardId) ||
                        (action === "connect" && !selectedCardId) || 
                        (action === "ask-agent" && !selectedCardId);
                    return (
                        <button
                            key={action}
                            type="button"
                            className={`flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm transition-colors ${disabled
                                    ? "text-text-muted cursor-not-allowed"
                                    : "text-text-secondary hover:bg-accent-glow hover:text-text-primary"
                                }`}
                            role="menuitem"
                            disabled={disabled}
                            onClick={() => handleAction(action)}
                        >
                            <span className="flex-1">{label}</span>
                            <kbd className="text-xs text-text-muted">{shortcut}</kbd>
                        </button>
                    );
                })}
            </div>
        </>
    );
}
