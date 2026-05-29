import { ActivityLog } from "./components/activity/ActivityLog";
import { DrawboardCanvas } from "./components/canvas/DrawboardCanvas";
import { CanvasProvider } from "./context/CanvasContext";

export default function App() {
  return (
    <CanvasProvider>
      <div className="relative h-full w-full overflow-hidden bg-canvas">
        <DrawboardCanvas />
        <ActivityLog />
      </div>
    </CanvasProvider>
  );
}
