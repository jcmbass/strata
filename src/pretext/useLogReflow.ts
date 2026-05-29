import { useMemo } from "react";
import {
    prepareWithSegments,
    layoutNextLine,
    type LayoutCursor,
} from "@chenglou/pretext";

/**
 * Multi-line word-wrap powered by Pretext's grapheme segmenter + layoutNextLine.
 *
 * Output is a flat array of physical rows, each tagged with which source line
 * produced it (so callers can colour by kind, mark the first row to render a
 * `$` prefix, etc).
 */
export interface SourceLogLine<K extends string> {
    text: string;
    kind: K;
}

export interface ReflowedRow<K extends string> {
    text: string;
    kind: K;
    /** x offset from the container's content origin (0 by default). */
    x: number;
    /** y offset from the container's content origin. */
    y: number;
    /** Measured pixel width of the row's text. */
    width: number;
    /** Index of the original `SourceLogLine` this row belongs to. */
    sourceIndex: number;
    /** True for the first physical row of a source line — useful for prefixes. */
    isFirstRow: boolean;
}

export interface ReflowOptions {
    /**
     * Per-source-line indent for the first physical row only.
     * Used by the card terminal to leave room for the accent `$` prompt glyph
     * without baking it into the cmd text.
     * `firstRowIndents[i]` applies to row 0 of source line i.
     */
    firstRowIndents?: number[];
}

interface ReflowResult<K extends string> {
    rows: ReflowedRow<K>[];
    totalHeight: number;
}

/**
 * Pure helper — also exported so it can be unit-tested without a React tree.
 */
export function reflowLogLines<K extends string>(
    lines: SourceLogLine<K>[],
    font: string,
    containerWidth: number,
    lineHeight: number,
    options: ReflowOptions = {}
): ReflowResult<K> {
    if (containerWidth <= 0 || lines.length === 0) {
        return { rows: [], totalHeight: 0 };
    }
    const indents = options.firstRowIndents ?? [];
    const rows: ReflowedRow<K>[] = [];
    let y = 0;

    for (let i = 0; i < lines.length; i++) {
        const { text, kind } = lines[i];
        if (!text) {
            // Empty source line still occupies one row of vertical space
            y += lineHeight;
            continue;
        }

        let prepared;
        try {
            prepared = prepareWithSegments(text, font);
        } catch {
            // If Pretext can't segment (rare — usually a font-loading edge case),
            // emit the line as a single row so the user still sees it.
            rows.push({ text, kind, x: indents[i] ?? 0, y, width: containerWidth, sourceIndex: i, isFirstRow: true });
            y += lineHeight;
            continue;
        }

        let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
        let isFirstRow = true;
        while (true) {
            const indent = isFirstRow ? indents[i] ?? 0 : 0;
            const available = Math.max(1, containerWidth - indent);
            const line = layoutNextLine(prepared, cursor, available);
            if (line === null) break;
            rows.push({
                text: line.text,
                kind,
                x: indent,
                y,
                width: line.width,
                sourceIndex: i,
                isFirstRow,
            });
            cursor = line.end;
            y += lineHeight;
            isFirstRow = false;
        }
    }

    return { rows, totalHeight: y };
}

/**
 * React hook wrapper that memoizes against the inputs that matter.
 *
 * Cost: re-runs whenever a new log line streams in (because `lines.length`
 * changes). That's intentional — we want fresh rows at the new total. The
 * pretext layout itself is O(graphemes) per source line and cheap enough at
 * the terminal-log sizes we deal with here.
 */
export function useLogReflow<K extends string>(
    lines: SourceLogLine<K>[],
    font: string,
    containerWidth: number,
    lineHeight: number,
    options?: ReflowOptions
): ReflowResult<K> {
    // Rebuild a stable options object keyed off the indent values so a fresh
    // `[]`/object literal each render doesn't bust the memo, and every value the
    // callback reads is an explicit, stable dependency.
    const indentsKey = options?.firstRowIndents?.join(",") ?? "";
    const stableOptions = useMemo<ReflowOptions | undefined>(
        () => (indentsKey ? { firstRowIndents: indentsKey.split(",").map(Number) } : undefined),
        [indentsKey]
    );
    return useMemo(
        () => reflowLogLines(lines, font, containerWidth, lineHeight, stableOptions),
        [lines, font, containerWidth, lineHeight, stableOptions]
    );
}
