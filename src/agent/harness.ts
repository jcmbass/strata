import type { Dispatch } from "react";
import type { CanvasState, CardData, Connection, CustomLogLine, TechKey } from "../types";
import type { Op, CanvasOpsArgs, ChatMessage, SerializedCanvasState } from "./types.gen";
import { streamChat } from "./client";
import { snapshot, rollback } from "./transactions";

// Subset of CanvasAction used by the harness — must stay in sync with CanvasContext.tsx
type HarnessCanvasAction =
    | { type: "ADD_CARD"; card: CardData }
    | { type: "DELETE_CARD"; id: string }
    | { type: "ADD_CONNECTION"; connection: Connection }
    | { type: "REMOVE_CONNECTION"; id: string }
    | { type: "MOVE_CARD"; id: string; position: { x: number; y: number } }
    | { type: "UPDATE_CARD_TITLE"; id: string; title: string }
    | {
        type: "UPDATE_CARD";
        id: string;
        patch: { title?: string; tech?: TechKey; customLogs?: CustomLogLine[] | undefined };
    }
    | { type: "RESET_CANVAS"; state: CanvasState };

export interface UndoCommand {
    label: string;
    execute: () => void;
    undo: () => void;
}

export interface HarnessCallbacks {
    getCanvasState(): CanvasState;
    dispatch: Dispatch<HarnessCanvasAction>;
    /** Push to undo stack without re-executing (ops already applied). */
    pushCommandSilent(cmd: UndoCommand): void;
    onToken(delta: string): void;
    onToolCall(callId: string, name: string, args: unknown): void;
    onToolResult(callId: string, success: boolean, summary: string): void;
    onDone(iterations: number): void;
    onError(code: string, message: string): void;
}

/** Serialize canvas state from React shape to API shape. */
export function serializeCanvasState(state: CanvasState): SerializedCanvasState {
    return {
        cards: state.cards.map((c) => ({
            id: c.id,
            title: c.title,
            x: c.position.x,
            y: c.position.y,
            width: c.size.width,
            height: c.size.height,
        })),
        connections: state.connections.map((conn) => ({
            id: conn.id,
            from_id: conn.fromCardId,
            to_id: conn.toCardId,
        })),
    };
}

/**
 * Execute a single canvas op against the React dispatch.
 * Returns true if the op was recognized, false if unknown.
 */
export function executeOp(op: Op, dispatch: Dispatch<HarnessCanvasAction>): boolean {
    switch (op.op) {
        case "create_card":
            dispatch({
                type: "ADD_CARD",
                card: {
                    id: op.id,
                    title: op.title,
                    position: { x: op.x ?? 80, y: op.y ?? 200 },
                    size: { width: op.width ?? 260, height: op.height ?? 200 },
                    connectedTo: [],
                    tech: op.tech ?? undefined,
                    runState: "idle",
                },
            });
            return true;

        case "delete_card":
            dispatch({ type: "DELETE_CARD", id: op.id });
            return true;

        case "connect_cards":
            dispatch({
                type: "ADD_CONNECTION",
                connection: {
                    id: `conn-${op.from_id}-${op.to_id}`,
                    fromCardId: op.from_id,
                    toCardId: op.to_id,
                },
            });
            return true;

        case "disconnect_cards":
            dispatch({ type: "REMOVE_CONNECTION", id: op.connection_id });
            return true;

        case "move_card":
            dispatch({ type: "MOVE_CARD", id: op.id, position: { x: op.x, y: op.y } });
            return true;

        case "set_label":
            dispatch({ type: "UPDATE_CARD_TITLE", id: op.id, title: op.title });
            return true;

        case "update_card": {
            // Build a patch with only the fields the agent actually provided.
            // null fields mean "no change" — only undefined keys are skipped at the
            // wire level, so we explicitly check for null too.
            const patch: { title?: string; tech?: TechKey; customLogs?: CustomLogLine[] } = {};
            if (op.title != null) patch.title = op.title;
            if (op.tech != null) patch.tech = op.tech;
            if (op.custom_logs != null) {
                // Empty array = explicit clear (handled in reducer). Map to internal shape.
                patch.customLogs = op.custom_logs.map((l) => ({
                    text: l.text,
                    kind: l.kind ?? "info",
                }));
            }
            dispatch({ type: "UPDATE_CARD", id: op.id, patch });
            return true;
        }

        default:
            return false;
    }
}

/**
 * Run the agent loop for one user message.
 *
 * Flow:
 * 1. Snapshot canvas state (for rollback).
 * 2. POST to /api/agent/chat and consume the SSE stream.
 * 3. On tool_call / apply_canvas_ops → execute each op against canvas dispatch.
 * 4. On error (or op failure) → rollback canvas to pre-batch snapshot.
 * 5. On done → push a single undo command covering the whole batch.
 */
export async function runAgent(
    userMessage: string,
    history: ChatMessage[],
    callbacks: HarnessCallbacks,
    signal: AbortSignal
): Promise<void> {
    const preState = snapshot(callbacks.getCanvasState());
    const appliedOps: Op[] = [];
    let failed = false;
    let rolledBack = false;

    // Internal controller so we can abort the stream from inside a callback.
    const innerController = new AbortController();
    signal.addEventListener("abort", () => innerController.abort(), { once: true });

    function doRollback(code: string, message: string) {
        failed = true;
        if (!rolledBack && appliedOps.length > 0) {
            rolledBack = true;
            rollback(preState, callbacks.dispatch as Dispatch<{ type: "RESET_CANVAS"; state: CanvasState }>);
        }
        callbacks.onError(code, message);
        innerController.abort();
    }

    await streamChat(
        {
            messages: [...history, { role: "user", content: userMessage }],
            canvas_state: serializeCanvasState(preState),
        },
        {
            onToken: (delta) => {
                if (failed) return;
                callbacks.onToken(delta);
            },

            onToolCall: (callId, name, args) => {
                if (failed) return;
                callbacks.onToolCall(callId, name, args);

                if (name === "apply_canvas_ops") {
                    const ops = (args as CanvasOpsArgs)?.ops ?? [];
                    for (const op of ops) {
                        const ok = executeOp(op, callbacks.dispatch);
                        if (!ok) {
                            doRollback("unknown_op", `Unknown op "${(op as { op: string }).op}" — canvas restored`);
                            return;
                        }
                        appliedOps.push(op);
                    }
                }
                // get_state is handled server-side; no client action needed.
            },

            onToolResult: (callId, success, summary) => {
                if (failed) return;
                callbacks.onToolResult(callId, success, summary);
                if (!success) {
                    doRollback("tool_failed", `Tool reported failure — canvas restored`);
                }
            },

            onDone: (iterations) => {
                if (failed) return;
                if (appliedOps.length > 0) {
                    const savedPre = preState;
                    const savedOps = [...appliedOps];
                    const savedDispatch = callbacks.dispatch;
                    callbacks.pushCommandSilent({
                        label: `Agent: "${userMessage.slice(0, 40)}"`,
                        execute: () => {
                            for (const op of savedOps) executeOp(op, savedDispatch);
                        },
                        undo: () =>
                            rollback(savedPre, savedDispatch as Dispatch<{ type: "RESET_CANVAS"; state: CanvasState }>),
                    });
                }
                callbacks.onDone(iterations);
            },

            onError: (code, message) => {
                doRollback(code, message);
            },
        },
        innerController.signal
    );
}