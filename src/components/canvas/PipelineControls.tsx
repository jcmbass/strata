import { useCanvasState } from "../../context/CanvasContext";
import { usePipelineRunner } from "./PipelineRunnerContext";

export function PipelineControls() {
    const { cards, connections } = useCanvasState();
    const { isRunning, runAll, reset } = usePipelineRunner();

    if (cards.length === 0) return null;

    return (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-xl border border-card-border bg-canvas-elevated/90 backdrop-blur-md px-1.5 py-1 shadow-lg">
            <button
                type="button"
                onClick={runAll}
                disabled={isRunning}
                className="focus-ring flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-text-primary hover:bg-accent/15 hover:text-accent transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Run pipeline"
                title="Run pipeline (topological order, parallel where possible)"
            >
                <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden>
                    <path d="M7 5l13 7-13 7V5z" fill="currentColor" />
                </svg>
                {isRunning ? "Running…" : "Run pipeline"}
            </button>
            <div className="w-px h-4 bg-card-border" />
            <button
                type="button"
                onClick={reset}
                className="focus-ring flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-text-muted hover:bg-card-bg hover:text-text-primary transition-colors duration-150"
                aria-label="Reset all stages"
                title="Reset all stages to idle"
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M3 12a9 9 0 1015-6.7L21 3M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Reset
            </button>
            <div className="w-px h-4 bg-card-border" />
            <span className="px-1.5 text-[10px] text-text-muted select-none">
                {cards.length} stage{cards.length === 1 ? "" : "s"} · {connections.length} link{connections.length === 1 ? "" : "s"}
            </span>
        </div>
    );
}
