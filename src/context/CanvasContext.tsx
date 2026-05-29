import { createContext, use, useReducer, type ReactNode, type Dispatch } from "react";
import type { CanvasState, Position, CardData, Connection, RunState, TechKey, CustomLogLine } from "../types";

type CanvasAction =
    | { type: "SET_VIEWPORT_OFFSET"; offset: Position }
    | { type: "SET_VIEWPORT_SCALE"; scale: number }
    | { type: "ADD_CARD"; card: CardData }
    | { type: "MOVE_CARD"; id: string; position: Position }
    | { type: "RESIZE_CARD"; id: string; size: { width: number; height: number } }
    | { type: "UPDATE_CARD_TITLE"; id: string; title: string }
    | {
        type: "UPDATE_CARD";
        id: string;
        patch: { title?: string; tech?: TechKey; customLogs?: CustomLogLine[] };
    }
    | { type: "DELETE_CARD"; id: string }
    | { type: "ADD_CONNECTION"; connection: Connection }
    | { type: "REMOVE_CONNECTION"; id: string }
    | { type: "SELECT_CARD"; id: string | null }
    | { type: "START_CONNECTING"; fromId: string }
    | { type: "CANCEL_CONNECTING" }
    | { type: "SHOW_TOOLBAR"; position: Position }
    | { type: "HIDE_TOOLBAR" }
    | { type: "SET_CARD_RUN_STATE"; id: string; runState: RunState; durationMs?: number }
    | { type: "RESET_ALL_RUN_STATES" }
    | { type: "SET_QUEUED_CARDS"; ids: string[] }
    | { type: "RESET_CANVAS"; state: CanvasState };

const initialState: CanvasState = {
    cards: [],
    connections: [],
    viewport: { offset: { x: 0, y: 0 }, scale: 1 },
    selectedCardId: null,
    connectingFromId: null,
    toolbarPosition: null,
    toolbarVisible: false,
    queuedCardIds: [],
};

function CanvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
    switch (action.type) {
        case "SET_VIEWPORT_OFFSET":
            return { ...state, viewport: { ...state.viewport, offset: action.offset } };
        case "SET_VIEWPORT_SCALE":
            return { ...state, viewport: { ...state.viewport, scale: action.scale } };
        case "ADD_CARD":
            return { ...state, cards: [...state.cards, action.card] };
        case "MOVE_CARD":
            return {
                ...state,
                cards: state.cards.map((c) =>
                    c.id === action.id ? { ...c, position: action.position } : c
                ),
            };
        case "RESIZE_CARD":
            return {
                ...state,
                cards: state.cards.map((c) =>
                    c.id === action.id ? { ...c, size: action.size } : c
                ),
            };
        case "UPDATE_CARD_TITLE":
            return {
                ...state,
                cards: state.cards.map((c) =>
                    c.id === action.id ? { ...c, title: action.title } : c
                ),
            };
        case "UPDATE_CARD":
            return {
                ...state,
                cards: state.cards.map((c) => {
                    if (c.id !== action.id) return c;
                    const { patch } = action;
                    // Empty array is the explicit signal to clear a previous override
                    // and return the card to its tech template.
                    const nextCustomLogs =
                        patch.customLogs === undefined
                            ? c.customLogs
                            : patch.customLogs.length === 0
                                ? undefined
                                : patch.customLogs;
                    return {
                        ...c,
                        title: patch.title ?? c.title,
                        tech: patch.tech ?? c.tech,
                        customLogs: nextCustomLogs,
                        // Editing a card invalidates its prior run — reset to idle so the
                        // user re-runs and sees the new simulation.
                        runState: "idle",
                        runDurationMs: undefined,
                    };
                }),
            };
        case "DELETE_CARD":
            return {
                ...state,
                cards: state.cards.filter((c) => c.id !== action.id),
                connections: state.connections.filter(
                    (conn) => conn.fromCardId !== action.id && conn.toCardId !== action.id
                ),
                selectedCardId:
                    state.selectedCardId === action.id ? null : state.selectedCardId,
                connectingFromId:
                    state.connectingFromId === action.id ? null : state.connectingFromId,
            };
        case "ADD_CONNECTION": {
            const dup = state.connections.some(
                (c) =>
                    (c.fromCardId === action.connection.fromCardId &&
                        c.toCardId === action.connection.toCardId) ||
                    (c.fromCardId === action.connection.toCardId &&
                        c.toCardId === action.connection.fromCardId)
            );
            if (dup) return state;
            return { ...state, connections: [...state.connections, action.connection] };
        }
        case "REMOVE_CONNECTION":
            return {
                ...state,
                connections: state.connections.filter((c) => c.id !== action.id),
            };
        case "SELECT_CARD":
            return { ...state, selectedCardId: action.id };
        case "START_CONNECTING":
            return { ...state, connectingFromId: action.fromId, toolbarVisible: false };
        case "CANCEL_CONNECTING":
            return { ...state, connectingFromId: null };
        case "SHOW_TOOLBAR":
            return {
                ...state,
                toolbarPosition: action.position,
                toolbarVisible: true,
            };
        case "HIDE_TOOLBAR":
            return { ...state, toolbarVisible: false };
        case "SET_CARD_RUN_STATE":
            return {
                ...state,
                cards: state.cards.map((c) =>
                    c.id === action.id
                        ? { ...c, runState: action.runState, runDurationMs: action.durationMs ?? c.runDurationMs }
                        : c
                ),
            };
        case "RESET_ALL_RUN_STATES":
            return {
                ...state,
                cards: state.cards.map((c) => ({ ...c, runState: "idle" as const, runDurationMs: undefined })),
                queuedCardIds: [],
            };
        case "SET_QUEUED_CARDS":
            return { ...state, queuedCardIds: action.ids };
        case "RESET_CANVAS":
            return action.state;
        default:
            return state;
    }
}

const CanvasCtx = createContext<CanvasState | null>(null);
const CanvasDispatchCtx = createContext<Dispatch<CanvasAction> | null>(null);

export function CanvasProvider({ children }: { children: ReactNode}) {
    const [state, dispatch] = useReducer(CanvasReducer, initialState);

    return (
        <CanvasCtx value={state}>
            <CanvasDispatchCtx value={dispatch}>{children}</CanvasDispatchCtx>
        </CanvasCtx>
    );
}

export function useCanvasState() {
    const ctx = use(CanvasCtx);
    if (!ctx) throw new Error("useCanvasState must be used within a CanvasProvider");
    return ctx;
}

export function useCanvasDispatch() {
    const ctx = use(CanvasDispatchCtx);
    if (!ctx) throw new Error("useCanvasDispatch must be used within a CanvasProvider");
    return ctx;
}