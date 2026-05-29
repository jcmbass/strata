export function PipelineControls() {
  return (
    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-xl border border-card-border bg-canvas-elevated/90 backdrop-blur=md px-1.5 py-1 shadow-lg">
      <button
        type="button"
        onClick={undefined}
        disabled={undefined}
        className="focus-ring flex items-center gap-1.5 px-2.5 py-1"
        aria-label="Add node"
        title="Add a new node to the pipeline"
      >
        <svg>
            <path d="M7 5l13 7-13 7V5z" fill="currentColor" />
        </svg>
        Running...
      </button>
      <div className="w-px h-4 bg-card-border" />
      <button
        type="button"
        onClick={undefined}
        className="px-3 py-1 bg-green-600 text-white rounded"
        aria-label="Reset all stages"
        title="Reset all stages to idle"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 12a9 9 0 1015-6.7L21 3M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Reset
    </button>
    </div>
  );
}