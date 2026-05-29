import type { Dispatch } from "react";
import type { CanvasState } from "../types";

// CanvasAction subset needed for rollback — must match CanvasContext.tsx
type ResetAction = { type: "RESET_CANVAS"; state: CanvasState };

/** Deep-clone canvas state before an agent batch so rollback is possible. */
export function snapshot(state: CanvasState): CanvasState {
  return JSON.parse(JSON.stringify(state)) as CanvasState;
}

/**
 * Restore canvas to a previously snapshotted state.
 * Called when an agent batch fails mid-execution.
 */
export function rollback(saved: CanvasState, dispatch: Dispatch<ResetAction>): void {
  dispatch({ type: "RESET_CANVAS", state: saved });
}
