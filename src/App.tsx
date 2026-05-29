import { ActivityLog } from "./components/activity/ActivityLog";
import { DrawboardCanvas } from "./components/canvas/DrawboardCanvas";

export default function App() {

  return (
    <div className="relative h-full w-full overflow-hidden bg-canvas">
      <DrawboardCanvas />
      <ActivityLog />
    </div>
  );
}
