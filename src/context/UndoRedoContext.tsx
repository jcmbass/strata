import {
  createContext,
  use,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import { useCanvasDispatch } from "./CanvasContext";

interface Command {
  execute: () => void;
  undo: () => void;
  label: string;
}

interface UndoRedoState {
  undoStack: Command[];
  redoStack: Command[];
}

type UndoRedoAction =
  | { type: "PUSH"; command: Command }
  | { type: "UNDO" }
  | { type: "REDO" };

const MAX_STACK = 50;

function undoRedoReducer(
  state: UndoRedoState,
  action: UndoRedoAction
): UndoRedoState {
  switch (action.type) {
    case "PUSH":
      return {
        undoStack: [...state.undoStack.slice(-(MAX_STACK - 1)), action.command],
        redoStack: [],
      };
    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const cmd = state.undoStack[state.undoStack.length - 1];
      cmd.undo();
      return {
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, cmd],
      };
    }
    case "REDO": {
      if (state.redoStack.length === 0) return state;
      const cmd = state.redoStack[state.redoStack.length - 1];
      cmd.execute();
      return {
        undoStack: [...state.undoStack, cmd],
        redoStack: state.redoStack.slice(0, -1),
      };
    }
    default:
      return state;
  }
}

const UndoRedoCtx = createContext<{
  pushCommand: (cmd: Command) => void;
  pushCommandSilent: (cmd: Command) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
} | null>(null);

export function UndoRedoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(undoRedoReducer, {
    undoStack: [],
    redoStack: [],
  });

  const pushCommand = useCallback((command: Command) => {
    command.execute();
    dispatch({ type: "PUSH", command });
  }, []);

  // Pushes onto the undo stack WITHOUT calling execute() first.
  // Used by the agent harness where ops are already applied to the canvas.
  const pushCommandSilent = useCallback((command: Command) => {
    dispatch({ type: "PUSH", command });
  }, []);

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);

  return (
    <UndoRedoCtx
      value={{
        pushCommand,
        pushCommandSilent,
        undo,
        redo,
        canUndo: state.undoStack.length > 0,
        canRedo: state.redoStack.length > 0,
      }}
    >
      {children}
    </UndoRedoCtx>
  );
}

export function useUndoRedo() {
  const ctx = use(UndoRedoCtx);
  if (!ctx)
    throw new Error("useUndoRedo must be used within UndoRedoProvider");
  return ctx;
}

export type { Command };

export function KeyboardShortcuts() {
  const { undo, redo } = useUndoRedo();
  const canvasDispatch = useCanvasDispatch();

  return (
    <div
      ref={(el) => {
        if (el) {
          const handler = (e: Event) => {
            const ke = e as KeyboardEvent;
            const mod = ke.metaKey || ke.ctrlKey;
            if (mod && ke.key === "z" && !ke.shiftKey) {
              e.preventDefault();
              undo();
            } else if (mod && (ke.key === "y" || (ke.key === "z" && ke.shiftKey))) {
              e.preventDefault();
              redo();
            } else if (ke.key === "Escape") {
              canvasDispatch({ type: "CANCEL_CONNECTING" });
              canvasDispatch({ type: "SELECT_CARD", id: null });
            }
          };
          window.addEventListener("keydown", handler);
        }
      }}
    />
  );
}
