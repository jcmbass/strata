import { useCallback, useEffect, useRef, useState } from "react";
import { useCanvasDispatch } from "../../context/CanvasContext";
import type { CustomLogLine, RunState, TechKey } from "../../types";
import { buildLogLines, pickDuration, type LogLine } from "./cardLogs";

/**
 * Drives the simulated "run" of a single pipeline card:
 *   idle → running (streams log lines on a realistic cadence) → success → idle (reset)
 *
 * The streamed lines feed Card.tsx's terminal, where useLogReflow lays them
 * out with Pretext — so the cadence here is what makes the wrap behaviour
 * visible (a long log line appearing mid-run reflows the rows below it).
 *
 * If `customLogs` is provided (via the agent's update_card op), the runner
 * streams those lines instead of the tech template's body. The same timing
 * scaling applies so the total duration still lands within the tech range.
 */
export interface UseCardRunner {
    visibleLines: LogLine[];
    isRunning: boolean;
    play(): void;
    reset(): void;
}

export function useCardRunner(
    cardId: string,
    tech: TechKey,
    runState: RunState,
    customLogs: CustomLogLine[] | undefined,
    onComplete?: (durationMs: number) => void
): UseCardRunner {
    const dispatch = useCanvasDispatch();
    const [visibleLines, setVisibleLines] = useState<LogLine[]>([]);
    const timers = useRef<number[]>([]);
    const startRef = useRef<number>(0);

    const clearTimers = useCallback(() => {
        for (const t of timers.current) window.clearTimeout(t);
        timers.current = [];
    }, []);

    // Schedules the timed reveals + the completion callback. Shared between
    // the user-initiated `play()` and the pipeline-runner external trigger.
    const scheduleStream = useCallback(() => {
        const lines = buildLogLines(tech, customLogs);
        if (lines.length === 0) {
            // Defensive: shouldn't happen, but if it does, jump straight to success
            // so the pipeline runner doesn't hang waiting for this card.
            dispatch({ type: "SET_CARD_RUN_STATE", id: cardId, runState: "success", durationMs: 0 });
            onComplete?.(0);
            return;
        }

        const targetTotal = pickDuration(tech, cardId);
        const naturalTotal = lines.reduce((s, l) => s + l.delayMs, 0);
        const scale = naturalTotal > 0 ? targetTotal / naturalTotal : 1;

        startRef.current = performance.now();
        let cumulative = 0;
        for (let i = 0; i < lines.length; i++) {
            cumulative += lines[i].delayMs * scale;
            const at = cumulative;
            const id = window.setTimeout(() => {
                setVisibleLines((prev) => [...prev, lines[i]]);
            }, at);
            timers.current.push(id);
        }
        const doneId = window.setTimeout(() => {
            const ms = Math.round(performance.now() - startRef.current);
            dispatch({ type: "SET_CARD_RUN_STATE", id: cardId, runState: "success", durationMs: ms });
            onComplete?.(ms);
        }, cumulative + 80);
        timers.current.push(doneId);
    }, [cardId, tech, customLogs, dispatch, onComplete]);

    const reset = useCallback(() => {
        clearTimers();
        setVisibleLines([]);
        dispatch({ type: "SET_CARD_RUN_STATE", id: cardId, runState: "idle" });
    }, [cardId, dispatch, clearTimers]);

    const play = useCallback(() => {
        clearTimers();
        setVisibleLines([]);
        dispatch({ type: "SET_CARD_RUN_STATE", id: cardId, runState: "running" });
        scheduleStream();
    }, [clearTimers, cardId, dispatch, scheduleStream]);

    // External run triggers (pipeline orchestrator) flip runState to "running"
    // via a global-reducer dispatch — NOT through this hook's play(). From this
    // hook's perspective the canvas reducer is an external store, so reacting to
    // its runState transitions in an Effect is the correct "synchronize with an
    // external system" pattern (see react.dev/learn/you-might-not-need-an-effect,
    // the external-store exception). The state writes here START the simulation;
    // they are not derived/mirrored state, so the heuristic warnings don't apply.
    const lastSeenRunState = useRef<RunState>(runState);
    /* oxlint-disable react-doctor/no-chain-state-updates, react-doctor/no-adjust-state-on-prop-change, react-doctor/no-derived-state, react-doctor/no-event-handler */
    useEffect(() => {
        if (lastSeenRunState.current === runState) return;
        if (runState === "running" && visibleLines.length === 0) {
            scheduleStream();
        } else if (runState === "idle") {
            clearTimers();
            setVisibleLines([]);
        }
        lastSeenRunState.current = runState;
    }, [runState, scheduleStream, clearTimers, visibleLines.length]);
    /* oxlint-enable react-doctor/no-chain-state-updates, react-doctor/no-adjust-state-on-prop-change, react-doctor/no-derived-state, react-doctor/no-event-handler */

    useEffect(() => () => clearTimers(), [clearTimers]);

    return {
        visibleLines,
        isRunning: runState === "running",
        play,
        reset,
    };
}
