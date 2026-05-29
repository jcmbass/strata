import { CanvasProvider } from "./context/CanvasContext";
import { PipelineRunnerProvider } from "./components/canvas/PipelineRunnerContext";
import { DrawboardCanvas } from "./components/canvas/DrawboardCanvas";
import { ActivityLog } from "./components/activity/ActivityLog";

export default function App() {
  return (
    <CanvasProvider>
      <PipelineRunnerProvider>
        <div className="relative h-full w-full overflow-hidden bg-canvas">
          <DrawboardCanvas />
          <ActivityLog />
        </div>
      </PipelineRunnerProvider>
    </CanvasProvider>
  );
}
