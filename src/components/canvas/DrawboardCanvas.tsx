import { useCanvasControls } from "../../hooks/useCanvasControls";
import { useCanvasState, useCanvasDispatch } from "../../context/CanvasContext";
import { Card } from "../cards/Card"
import { PipelineControls } from "./PipelineControls";

export function DrawboardCanvas() {
  const { cards, connectingFromId } = useCanvasState();
  const dispatch = useCanvasDispatch();
  const { canvasTransform, handlers } = useCanvasControls();
  // Pull the keyboard handler out of the spread so it's statically visible
  // alongside onClick (pairs the click affordance with a key listener).
  const { onKeyDown, ...pointerHandlers } = handlers;

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return; // Ignore clicks on cards / children
    if (connectingFromId) {
      dispatch({ type: "CANCEL_CONNECTING" });
    } else {
      dispatch({ type: "SELECT_CARD", id: null });
    }
  };

  return (
    <div
      className="absolute inset-0 bg-canvas outline-none"
      tabIndex={-1}
      role="application"
      aria-label="Strata workflow canvas. Middle-click or press Space+drag to pan. Scroll to zoom. Right-click for toolbar."
      onClick={handleCanvasClick}
      onKeyDown={onKeyDown}
      {...pointerHandlers}
    >
      <svg className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <defs>
          <pattern
            id="grid"
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
            patternTransform={canvasTransform}
          >
            <circle cx="0" cy="0" r="0.5" className="fill-zinc-800" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <div>
        <h2> Connector Lines</h2>
        {cards.map((card) => (
          <Card key={card.id} card={card} />
        ))}
      </div>
      <PipelineControls />
    </div>
  );
}