import { CanvasProvider } from "./context/CanvasContext";
import { PipelineRunnerProvider } from "./components/canvas/PipelineRunnerContext";
import { DrawboardCanvas } from "./components/canvas/DrawboardCanvas";
import { ChatPanel } from "./components/chat/ChatPanel";

export default function App() {
  return (
    <CanvasProvider>
      <PipelineRunnerProvider>
        <div className="relative h-full w-full overflow-hidden bg-canvas">
          <DrawboardCanvas />
          <ChatPanel />
        </div>
      </PipelineRunnerProvider>
    </CanvasProvider>
  );
}
