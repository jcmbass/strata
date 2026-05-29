import { CanvasProvider } from "./context/CanvasContext";
import { UndoRedoProvider, KeyboardShortcuts } from "./context/UndoRedoContext";
import { AgentProvider } from "./agent/AgentProvider";
import { PipelineRunnerProvider } from "./components/canvas/PipelineRunnerContext";
import { DrawboardCanvas } from "./components/canvas/DrawboardCanvas";
import { ChatPanel } from "./components/chat/ChatPanel";
import { FloatingToolbar } from "./components/toolbar/FloatingToolbar";
import { CommandPalette } from "./components/palette/CommandPalette";

export default function App() {
  return (
    <UndoRedoProvider>
      <CanvasProvider>
        <KeyboardShortcuts />
        <PipelineRunnerProvider>
          <AgentProvider>
            <div className="relative h-full w-full overflow-hidden bg-canvas">
              <DrawboardCanvas />
              <ChatPanel />
              <FloatingToolbar />
              <CommandPalette />
            </div>
          </AgentProvider>
        </PipelineRunnerProvider>
      </CanvasProvider>
    </UndoRedoProvider>
  );
}
