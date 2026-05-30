import { createContext, use, useRef, type ReactNode, type RefObject } from "react";
import { useAgent, type AgentStatus, type AgentLogEntry } from "./useAgent";

interface AgentContextValue {
  status: AgentStatus;
  log: AgentLogEntry[];
  submit: (message: string) => void;
  abort: () => void;
  clearLog: () => void;
  editingCardId: string | null;
  editingCardTitle: string | null;
  setEditingCard: (id: string | null, title?: string | null) => void;
  /** Ref the chat input registers itself into so the command palette can focus it. */
  inputRef: RefObject<HTMLTextAreaElement | null>;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const agent = useAgent();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  return (
    <AgentContext value={{ ...agent, inputRef }}>
      {children}
    </AgentContext>
  );
}

export function useAgentContext(): AgentContextValue {
  const ctx = use(AgentContext);
  if (!ctx) throw new Error("useAgentContext must be used within AgentProvider");
  return ctx;
}
