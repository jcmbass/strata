export interface Position {
    x: number;
    y: number;
}

export interface Size {
    width: number;
    height: number;
}

export type TechKey =
    | "github"
    | "npm"
    | "vite"
    | "webpack"
    | "vitest"
    | "eslint"
    | "docker"
    | "kubernetes"
    | "prometheus"
    | "terminal";

export type RunState = "idle" | "running" | "success" | "failed";

export type LogKind = "cmd" | "info" | "dim" | "success" | "warn" | "error";

export interface CustomLogLine {
    text: string;
    kind: LogKind;
}

export interface CardData {
    id: string;
    position: Position;
    size: Size;
    title: string;
    connectedTo: string[];
    tech?: TechKey;
    runState?: RunState;
    runDurationMs?: number;
    /** Per-card override of the simulated log body. When set, the runner uses
     *  these lines instead of the default tech template. */
    customLogs?: CustomLogLine[];
}

export interface Connection {
    id: string;
    fromCardId: string;
    toCardId: string;
}

export interface CanvasViewport {
    offset: Position;
    scale: number;
}

export type ToolbarAction = "add-card" | "connect" | "ask-agent" | "delete";

export interface CanvasState {
    cards: CardData[];
    connections: Connection[];
    viewport: CanvasViewport;
    selectedCardId: string | null;
    connectingFromId: string | null;
    toolbarPosition: Position | null;
    toolbarVisible: boolean;
    /** Card IDs in the next pipeline wave (transient UI hint while a run is in flight). */
    queuedCardIds: string[];
}