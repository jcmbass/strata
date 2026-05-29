import { Card } from "../cards/Card"
import { PipelineControls } from "./PipelineControls";

export function DrawboardCanvas() {
  return (
    <div 
      className="absolute inset-0 bg-canvas outline-none"
      tabIndex={-1}
      role="application"
      aria-label="Strata workflow canvas. Middle-click or press Space+drag to pan. Scroll to zoom. Right-click for toolbar."
      onClick={undefined}
      onKeyDown={undefined}
    >
      <svg className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <defs>
          <pattern 
            id="grid" 
            width="32" 
            height="32" 
            patternUnits="userSpaceOnUse"
            patternTransform={undefined}
          >
            <circle cx="0" cy="0" r="0.5" className="fill-zinc-800"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <div>
        <h2> Connector Lines</h2>
        <Card />
      </div>
      <PipelineControls />
    </div>
  );
}