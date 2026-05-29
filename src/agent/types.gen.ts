// Hand-maintained mirror of api/schemas.py — keep in sync.
// Run `make gen-types` to regenerate from Pydantic (once codegen is wired up).

export type StreamEvent =
  | { type: "token"; delta: string }
  | { type: "tool_call"; call_id: string; name: string; args: CanvasOpsArgs | GetStateArgs }
  | { type: "tool_result"; call_id: string; success: boolean; summary: string }
  | { type: "done"; iterations: number }
  | { type: "error"; code: string; message: string };

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

export type LogKind = "cmd" | "info" | "dim" | "success" | "warn" | "error";

export interface CustomLogLine {
  text: string;
  kind?: LogKind;
}

export type Op =
  | { op: "create_card"; id: string; title: string; x?: number; y?: number; width?: number; height?: number; tech?: TechKey | null }
  | { op: "delete_card"; id: string }
  | { op: "connect_cards"; from_id: string; to_id: string }
  | { op: "disconnect_cards"; connection_id: string }
  | { op: "move_card"; id: string; x: number; y: number }
  | { op: "set_label"; id: string; title: string }
  | { op: "update_card"; id: string; title?: string | null; tech?: TechKey | null; custom_logs?: CustomLogLine[] | null };

export interface CanvasOpsArgs {
  ops: Op[];
}

export type GetStateArgs = Record<string, never>;

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface SerializedCard {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SerializedConnection {
  id: string;
  from_id: string;
  to_id: string;
}

export interface SerializedCanvasState {
  cards: SerializedCard[];
  connections: SerializedConnection[];
}

export interface ChatRequest {
  messages: ChatMessage[];
  canvas_state: SerializedCanvasState;
}