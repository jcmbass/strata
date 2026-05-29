

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export type AsciiFlowMood = "smile" | "thinking";

export function AsciiFlow({
    size = 132,
    mood = "smile",
}: {
    size?: number;
    mood?: AsciiFlowMood;
}) {

    return (
        <div
            style={{ fontSize: size / 10 }}
            className="font-mono leading-[0.8] select-none"
        >
            {mood === "smile" ? "( ^_^)" : "( -_-)"}
        </div>
    );
}