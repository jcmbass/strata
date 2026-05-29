import { createContext, useCallback, use, useRef, useState, type ReactNode } from "react";
import { useCanvasState, useCanvasDispatch } from "../../context/CanvasContext";
import type { CardData, TechKey } from "../../types";
import { detectTech } from "../cards/cardTech";
import { pickDuration } from "../cards/cardLogs";

/**
 * Topological wave grouping. Wave[i] runs in parallel; wave[i+1] waits for
 * the slowest of wave[i] to finish.
 */
function buildRunWaves(cards: CardData[], edges: { from: string; to: string }[]): string[][] {
    const indeg = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const c of cards) {
        indeg.set(c.id, 0);
        adj.set(c.id, []);
    }
    for (const e of edges) {
        if (!indeg.has(e.from) || !indeg.has(e.to)) continue;
        adj.get(e.from)!.push(e.to);
        indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
    }

    const waves: string[][] = [];
    let frontier = cards.reduce<string[]>((acc, c) => {
        if ((indeg.get(c.id) ?? 0) === 0) acc.push(c.id);
        return acc;
    }, []);
    const visited = new Set<string>();

    while (frontier.length > 0) {
        waves.push(frontier);
        for (const id of frontier) visited.add(id);
        const next: string[] = [];
        for (const id of frontier) {
            for (const child of adj.get(id) ?? []) {
                const d = (indeg.get(child) ?? 0) - 1;
                indeg.set(child, d);
                if (d === 0) next.push(child);
            }
        }
        frontier = next;
    }

    const stragglers = cards.reduce<string[]>((acc, c) => {
        if (!visited.has(c.id)) acc.push(c.id);
        return acc;
    }, []);
    if (stragglers.length) waves.push(stragglers);
    return waves;
}

interface PipelineRunnerContextValue {
    isRunning: boolean;
    runAll: () => Promise<void>;
    reset: () => void;
}

const PipelineRunnerContext = createContext<PipelineRunnerContextValue | null>(null);

export function PipelineRunnerProvider({ children }: { children: ReactNode }) {
    const { cards, connections } = useCanvasState();
    const dispatch = useCanvasDispatch();
    const [isRunning, setIsRunning] = useState(false);
    const cancelRef = useRef(false);

    const reset = useCallback(() => {
        cancelRef.current = true;
        dispatch({ type: "RESET_ALL_RUN_STATES" });
        dispatch({ type: "SET_QUEUED_CARDS", ids: [] });
        setIsRunning(false);
    }, [dispatch]);

    const runAll = useCallback(async () => {
        if (cards.length === 0 || isRunning) return;
        cancelRef.current = false;
        setIsRunning(true);
        dispatch({ type: "RESET_ALL_RUN_STATES" });

        const edges = connections.map((c) => ({ from: c.fromCardId, to: c.toCardId }));
        const waves = buildRunWaves(cards, edges);
        const cardById = new Map(cards.map((c) => [c.id, c]));

        const allQueued = waves.slice(1).flat();
        if (allQueued.length) dispatch({ type: "SET_QUEUED_CARDS", ids: allQueued });

        for (let i = 0; i < waves.length; i++) {
            if (cancelRef.current) break;
            const wave = waves[i];
            const remainingQueued = waves.slice(i + 1).flat();
            dispatch({ type: "SET_QUEUED_CARDS", ids: remainingQueued });

            const cardObjs = wave.flatMap((id) => {
                const c = cardById.get(id);
                return c ? [c] : [];
            });

            for (const c of cardObjs) {
                dispatch({ type: "SET_CARD_RUN_STATE", id: c.id, runState: "running" });
            }

            const longest = Math.max(
                ...cardObjs.map((c) => {
                    const tech: TechKey = c.tech ?? detectTech(c.title);
                    return pickDuration(tech, c.id);
                })
            );
            // Waves are strictly sequential: wave i+1 must not start until the
            // slowest card in wave i finishes (topological dependency). This await
            // is intentionally serial — not a candidate for Promise.all.
            // oxlint-disable-next-line react-doctor/async-await-in-loop
            await new Promise((r) => setTimeout(r, longest + 250));
        }

        dispatch({ type: "SET_QUEUED_CARDS", ids: [] });
        setIsRunning(false);
    }, [cards, connections, dispatch, isRunning]);

    return (
        <PipelineRunnerContext value={{ isRunning, runAll, reset }}>
            {children}
        </PipelineRunnerContext>
    );
}

export function usePipelineRunner(): PipelineRunnerContextValue {
    const ctx = use(PipelineRunnerContext);
    if (!ctx) throw new Error("usePipelineRunner must be used within PipelineRunnerProvider");
    return ctx;
}
