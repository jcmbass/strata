import { useState, useCallback, useRef } from "react";
import { useCanvasState, useCanvasDispatch } from "../context/CanvasContext";
import { useUndoRedo } from "../context/UndoRedoContext";
import { runAgent } from "./harness";
import type { ChatMessage } from "./types.gen";

export type AgentStatus = "idle" | "running" | "done" | "error";

export type AgentLogEntryType =
    | "user"
    | "assistant"
    | "tool_call"
    | "tool_result"
    | "error";

export interface AgentLogEntry {
    id: string;
    type: AgentLogEntryType;
    content: string;
    /** For tool_call / tool_result entries */
    callId?: string;
    toolName?: string;
    success?: boolean;
    /** When the user message was sent while editing a specific card */
    editingCardTitle?: string;
}

let _idCounter = 0;
function uid() {
    return `ale-${Date.now()}-${++_idCounter}`;
}

/**
 * Main hook for the agent loop.
 * Exposes:
 * - `log`     — ordered list of entries for ActivityLog to render
 * - `status`  — "idle" | "running" | "done" | "error"
 * - `submit`  — send a user message (no-ops while already running)
 * - `abort`   — cancel the current stream (Escape key / X button)
 */
export function useAgent() {
    const [status, setStatus] = useState<AgentStatus>("idle");
    const [log, setLog] = useState<AgentLogEntry[]>([]);
    const [editingCardId, setEditingCardId] = useState<string | null>(null);
    const [editingCardTitle, setEditingCardTitle] = useState<string | null>(null);

    // Conversation history — user+assistant pairs sent to the server each turn.
    const historyRef = useRef<ChatMessage[]>([]);

    // AbortController for the current stream.
    const abortRef = useRef<AbortController | null>(null);

    // Accumulates tokens for the current assistant entry while streaming.
    const assistantEntryIdRef = useRef<string>("");
    const assistantContentRef = useRef<string>("");

    const canvasState = useCanvasState();
    const canvasDispatch = useCanvasDispatch();
    const { pushCommandSilent } = useUndoRedo();

    const appendEntry = useCallback((entry: AgentLogEntry) => {
        setLog((prev) => [...prev, entry]);
    }, []);

    const setEditingCard = useCallback((id: string | null, title?: string | null) => {
        setEditingCardId(id);
        setEditingCardTitle(title ?? null);
    }, []);

    const submit = useCallback(
        async (message: string) => {
            if (status === "running") return;
            if (!message.trim()) return;

            const controller = new AbortController();
            abortRef.current = controller;
            setStatus("running");

            // Capture editing context before clearing it
            const cardId = editingCardId;
            const cardTitle = editingCardTitle;
            const finalMessage = cardId ? `[edit card: ${cardId}] ${message}` : message;

            // Clear editing indicator from input (it moves to the bubble)
            setEditingCardId(null);
            setEditingCardTitle(null);

            // User message entry — store original message for display; card ID lives in finalMessage sent to the agent
            appendEntry({
                id: uid(),
                type: "user",
                content: message,
                editingCardTitle: cardTitle ?? undefined,
            });

            // Placeholder for streaming assistant response
            const assistantId = uid();
            assistantEntryIdRef.current = assistantId;
            assistantContentRef.current = "";
            appendEntry({ id: assistantId, type: "assistant", content: "" });

            // Snapshot canvas state for the agent call (captured at submit time).
            const stateAtSubmit = canvasState;

            await runAgent(
                finalMessage,
                historyRef.current,
                {
                    getCanvasState: () => stateAtSubmit,
                    dispatch: canvasDispatch,
                    pushCommandSilent,

                    onToken: (delta) => {
                        assistantContentRef.current += delta;
                        const content = assistantContentRef.current;
                        setLog((prev) =>
                            prev.map((e) => (e.id === assistantId ? { ...e, content } : e))
                        );
                    },

                    onToolCall: (callId, name) => {
                        appendEntry({
                            id: uid(),
                            type: "tool_call",
                            content: name === "get_state" ? "Reading canvas state…" : `Applying canvas ops…`,
                            callId,
                            toolName: name,
                        });
                    },

                    onToolResult: (callId, success, summary) => {
                        appendEntry({
                            id: uid(),
                            type: "tool_result",
                            content: summary || (success ? "Done" : "Failed"),
                            callId,
                            success,
                        });
                    },

                    onDone: () => {
                        // Persist to conversation history so multi-turn works
                        const assistantContent = assistantContentRef.current;
                        historyRef.current = [
                            ...historyRef.current,
                            { role: "user", content: finalMessage },
                            ...(assistantContent
                                ? [{ role: "assistant" as const, content: assistantContent }]
                                : []),
                        ];
                        setStatus("done");
                        // Auto-reset to idle after a beat so submit() can be called again
                        setTimeout(() => setStatus("idle"), 800);
                    },

                    onError: (code, errMessage) => {
                        const friendly =
                            code === "rate_limit"
                                ? errMessage
                                : code === "timeout"
                                    ? errMessage
                                    : `Error (${code}): ${errMessage}`;
                        appendEntry({ id: uid(), type: "error", content: friendly });
                        setStatus("error");
                        setTimeout(() => setStatus("idle"), 3000);
                    },
                },
                controller.signal
            );
        },
        [status, canvasState, canvasDispatch, pushCommandSilent, appendEntry, editingCardId, editingCardTitle]
    );

    const abort = useCallback(() => {
        abortRef.current?.abort();
        setStatus("idle");
    }, []);

    const clearLog = useCallback(() => {
        setLog([]);
        historyRef.current = [];
    }, []);

    return { status, log, submit, abort, clearLog, editingCardId, editingCardTitle, setEditingCard };
}
