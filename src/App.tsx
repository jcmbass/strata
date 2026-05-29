import { CanvasProvider } from "./context/CanvasContext";
import { UndoRedoProvider, KeyboardShortcuts } from "./context/UndoRedoContext";
import { AgentProvider } from "./agent/AgentProvider";
import { PipelineRunnerProvider } from "./components/canvas/PipelineRunnerContext";
import { DrawboardCanvas } from "./components/canvas/DrawboardCanvas";
import { ChatPanel } from "./components/chat/ChatPanel";

export default function App() {
  return (
    <UndoRedoProvider>
    <CanvasProvider>
      <PipelineRunnerProvider>
        <AgentProvider>
          <div className="relative h-full w-full overflow-hidden bg-canvas">
            <DrawboardCanvas />
            <ChatPanel />
          </div>
        </AgentProvider>
      </PipelineRunnerProvider>
    </CanvasProvider>
    </UndoRedoProvider>
  );
}
