import type { ChatRequest, StreamEvent } from "./types.gen";

export interface StreamHandlers {
    onToken(delta: string): void;
    onToolCall(callId: string, name: string, args: unknown): void;
    onToolResult(callId: string, success: boolean, summary: string): void;
    onDone(iterations: number): void;
    onError(code: string, message: string): void;
}

/**
 * POST to /api/agent/chat and consume the SSE stream.
 * Calls appropriate handler for each event type.
 * Aborts cleanly when signal fires (e.g. user presses Escape).
 */
export async function streamChat(
    request: ChatRequest,
    handlers: StreamHandlers,
    signal: AbortSignal
): Promise<void> {
    let response: Response;
    try {
        response = await fetch("/api/agent/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
            signal,
        });
    } catch (err) {
        if ((err as Error).name === "AbortError") return;
        handlers.onError("fetch_error", "Could not connect to agent server");
        return;
    }

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        handlers.onError("http_error", `Server returned ${response.status}${text ? `: ${text}` : ""}`);
        return;
    }

    if (!response.body) {
        handlers.onError("no_body", "Empty response from server");
        return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
        while (true) {
            // Reading an SSE stream is inherently sequential — each read() yields the
            // next chunk as it arrives. There is nothing to parallelize here.
            // oxlint-disable-next-line react-doctor/async-await-in-loop
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const raw = line.slice(6).trim();
                if (!raw) continue;

                let event: StreamEvent;
                try {
                    event = JSON.parse(raw) as StreamEvent;
                } catch {
                    continue;
                }

                switch (event.type) {
                    case "token":
                        handlers.onToken(event.delta);
                        break;
                    case "tool_call":
                        handlers.onToolCall(event.call_id, event.name, event.args);
                        break;
                    case "tool_result":
                        handlers.onToolResult(event.call_id, event.success, event.summary);
                        break;
                    case "done":
                        handlers.onDone(event.iterations);
                        return;
                    case "error":
                        handlers.onError(event.code, event.message);
                        return;
                }
            }
        }
    } catch (err) {
        if ((err as Error).name !== "AbortError") {
            handlers.onError("stream_error", "Stream interrupted unexpectedly");
        }
    } finally {
        reader.releaseLock();
    }
}