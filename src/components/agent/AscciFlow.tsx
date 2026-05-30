import { useEffect, useRef } from "react";
import { prepareWithSegments } from "@chenglou/pretext";

// ---------------------------------------------------------------------------
// Pretext-driven ASCII face used as the Strata Agent "logo".
//
// Same brightness-field + variable-typography pipeline as
// pretext/pages/demos/variable-typographic-ascii.ts: we paint facial features
// (brows, eyes + pupils, cheeks, mouth) into a brightness field, downsample to
// a character grid, and let Pretext's measured glyph widths pick a glyph per
// cell whose typographic weight/width matches the target brightness.
//
// Higher resolution than the original 22x6 strip — a ~42x26 grid with a 2x
// oversampled field — gives enough vertical room for genuine expression while
// staying compact (smaller than the chat panel even at its minimum width).
//
// Expressions morph smoothly (per-frame lerp) between four moods:
//   - smile:     calm, open eyes, gentle smile, wandering gaze, periodic blink
//   - thinking:  raised brows, eyes glance up, small "o", floating thought dots
//   - happy:     squinted ^^ eyes, big open grin, blushed cheeks
//   - concerned: worried inner-up brows, slightly wide eyes, downturned mouth
//
// Columns are kept aligned by emitting width-measured filler glyphs at opacity
// 0 for empty cells (run-length collapsed), so the proportional font still
// renders a crisp pixel grid.
// ---------------------------------------------------------------------------

const COLS = 42;
const ROWS = 26;
const FONT_SIZE = 9;
const LINE_HEIGHT = 9;
const TARGET_ROW_W = 200; // px → targetCellW ≈ 4.76px
const PROP_FAMILY = 'Georgia, Palatino, "Times New Roman", serif';

const FIELD_OVERSAMPLE = 2;
const FIELD_COLS = COLS * FIELD_OVERSAMPLE;
const FIELD_ROWS = ROWS * FIELD_OVERSAMPLE;
const CANVAS_W = TARGET_ROW_W;
const CANVAS_H = ROWS * LINE_HEIGHT;
const FIELD_SCALE_X = FIELD_COLS / CANVAS_W;
const FIELD_SCALE_Y = FIELD_ROWS / CANVAS_H;
const TARGET_CELL_W = TARGET_ROW_W / COLS;

const BOX_W = TARGET_ROW_W + 14;
const BOX_H = CANVAS_H + 12;

const CHARSET = ".,:;!+-=*#@%&abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const WEIGHTS = [300, 500, 800] as const;
const STYLES = ["normal", "italic"] as const;

const FPS_INTERVAL = 1000 / 30; // throttle paint to ~30fps — plenty for a face

type FontStyleVariant = (typeof STYLES)[number];
type PaletteEntry = {
  char: string;
  weight: number;
  style: FontStyleVariant;
  width: number;
  brightness: number;
};
// One cell of the brightness→glyph lookup. Empty cells become opacity-0 filler.
type Cell =
  | { empty: true }
  | { empty: false; cls: string; char: string };

type LookupResult = { cells: Cell[]; filler: string };

// ---------------------------------------------------------------------------
// Palette construction — runs once, lazily, on first render.
// Uses Pretext's prepareWithSegments() to measure each character's true
// rendered width in the chosen proportional font, so we can pick the glyph
// whose typographic weight best matches a target cell width, and so we can
// pick a single filler glyph that tiles the grid evenly.
// ---------------------------------------------------------------------------
let cachedLookup: LookupResult | null = null;

function buildPalette(): LookupResult {
  if (cachedLookup) return cachedLookup;
  if (typeof document === "undefined") return { cells: [], filler: " " };

  const probe = document.createElement("canvas");
  probe.width = 28;
  probe.height = 28;
  const probeCtx = probe.getContext("2d", { willReadFrequently: true });
  if (!probeCtx) return { cells: [], filler: " " };

  const palette: PaletteEntry[] = [];
  for (const style of STYLES) {
    for (const weight of WEIGHTS) {
      const font = `${style === "italic" ? "italic " : ""}${weight} ${FONT_SIZE}px ${PROP_FAMILY}`;
      for (const ch of CHARSET) {
        const prepared = prepareWithSegments(ch, font);
        const width = prepared.widths.length > 0 ? prepared.widths[0]! : 0;
        if (width <= 0) continue;

        probeCtx.clearRect(0, 0, 28, 28);
        probeCtx.font = font;
        probeCtx.fillStyle = "#fff";
        probeCtx.textBaseline = "middle";
        probeCtx.fillText(ch, 1, 14);
        const data = probeCtx.getImageData(0, 0, 28, 28).data;
        let sum = 0;
        for (let i = 3; i < data.length; i += 4) sum += data[i]!;
        const brightness = sum / (255 * 28 * 28);

        palette.push({ char: ch, weight, style, width, brightness });
      }
    }
  }

  const maxB = Math.max(...palette.map((p) => p.brightness));
  if (maxB > 0) for (const p of palette) p.brightness /= maxB;
  palette.sort((a, b) => a.brightness - b.brightness);

  // Filler: the glyph whose width is closest to the target cell width. Repeated
  // inside an opacity-0 span it holds empty columns at the right pitch.
  let filler = palette[0]?.char ?? " ";
  let fillerErr = Infinity;
  for (const p of palette) {
    const err = Math.abs(p.width - TARGET_CELL_W);
    if (err < fillerErr) {
      fillerErr = err;
      filler = p.char;
    }
  }

  const cells: Cell[] = [];
  for (let byte = 0; byte < 256; byte++) {
    const target = byte / 255;
    if (target < 0.05) {
      cells.push({ empty: true });
      continue;
    }
    let lo = 0;
    let hi = palette.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (palette[mid]!.brightness < target) lo = mid + 1;
      else hi = mid;
    }
    let best = palette[lo]!;
    let bestScore = Infinity;
    const start = Math.max(0, lo - 12);
    const end = Math.min(palette.length, lo + 12);
    for (let i = start; i < end; i++) {
      const e = palette[i]!;
      const bErr = Math.abs(e.brightness - target) * 2.5;
      const wErr = Math.abs(e.width - TARGET_CELL_W) / TARGET_CELL_W;
      const score = bErr + wErr;
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    const alpha = Math.max(1, Math.min(10, Math.round(target * 10)));
    const cls = `af-w${best.weight}${best.style === "italic" ? " af-it" : ""} af-a${alpha}`;
    cells.push({ empty: false, cls, char: escChar(best.char) });
  }

  cachedLookup = { cells, filler };
  return cachedLookup;
}

function escChar(ch: string): string {
  if (ch === "<") return "&lt;";
  if (ch === ">") return "&gt;";
  if (ch === "&") return "&amp;";
  if (ch === '"') return "&quot;";
  return ch;
}

// ---------------------------------------------------------------------------
// Expression presets
//
// Offsets are in CANVAS px. Brows/eyes/mouth are positioned relative to fixed
// anchors; these presets nudge them per mood. Negative brow offsets raise the
// brow (smaller y). mouthCurve > 0 is a smile (valley at center); < 0 a frown.
// ---------------------------------------------------------------------------
type Expr = {
  browInner: number;
  browOuter: number;
  browY: number;
  eyeOpen: number; // 1 = open, <0.6 = squint arc, ~0 = closed lid
  lookX: number;
  lookY: number;
  mouthCurve: number;
  mouthOpen: number;
  mouthY: number;
  mouthW: number;
  cheek: number;
};

export type AsciiFlowMood = "smile" | "thinking" | "happy" | "concerned" | "excited";

const EXPR: Record<AsciiFlowMood, Expr> = {
  smile: {
    browInner: -1, browOuter: 0, browY: 0, eyeOpen: 1, lookX: 0, lookY: 0,
    mouthCurve: 6, mouthOpen: 0, mouthY: 0, mouthW: 40, cheek: 0,
  },
  thinking: {
    browInner: -5, browOuter: -1, browY: -2, eyeOpen: 0.9, lookX: 5, lookY: -5,
    mouthCurve: -1, mouthOpen: 5, mouthY: -2, mouthW: 18, cheek: 0,
  },
  happy: {
    browInner: -3, browOuter: -1, browY: -2, eyeOpen: 0.45, lookX: 0, lookY: 0,
    mouthCurve: 11, mouthOpen: 7, mouthY: 2, mouthW: 50, cheek: 0.7,
  },
  concerned: {
    browInner: -7, browOuter: 4, browY: -1, eyeOpen: 1.05, lookX: 0, lookY: 3,
    mouthCurve: -7, mouthOpen: 0, mouthY: 4, mouthW: 34, cheek: 0,
  },
  // Watching the pipeline run: wide attentive eyes, brows up in anticipation,
  // an eager half-open smile.
  excited: {
    browInner: -4, browOuter: -3, browY: -2, eyeOpen: 1.15, lookX: 0, lookY: -1,
    mouthCurve: 8, mouthOpen: 4, mouthY: 0, mouthW: 38, cheek: 0.3,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AsciiFlow({
  size,
  mood = "smile",
}: {
  /** Optional max width override (px). Defaults to the natural grid width. */
  size?: number;
  mood?: AsciiFlowMood;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  // Mood is read from a ref inside the RAF loop so we don't tear down/restart
  // the animation when the parent changes status — it morphs in place.
  const moodRef = useRef(mood);
  moodRef.current = mood;

  useEffect(() => {
    const { cells, filler } = buildPalette();
    if (cells.length === 0) return;
    const box = boxRef.current;
    if (!box) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const field = new Float32Array(FIELD_COLS * FIELD_ROWS);

    // Splat kernels with separate x/y radii (px) — lets us build squashed
    // shapes like flat closed-eye lids and oval eyes.
    const makeStamp = (rxPx: number, ryPx: number) => {
      const frx = Math.max(0.5, rxPx * FIELD_SCALE_X);
      const fry = Math.max(0.5, ryPx * FIELD_SCALE_Y);
      const rx = Math.max(1, Math.ceil(frx));
      const ry = Math.max(1, Math.ceil(fry));
      const sx = rx * 2 + 1;
      const v = new Float32Array(sx * (ry * 2 + 1));
      for (let y = -ry; y <= ry; y++) {
        for (let x = -rx; x <= rx; x++) {
          const d = Math.sqrt((x / frx) ** 2 + (y / fry) ** 2);
          let a = 0;
          if (d < 1) a = d < 0.4 ? 1 : 1 - (d - 0.4) / 0.6;
          v[(y + ry) * sx + x + rx] = a;
        }
      }
      return { rx, ry, sx, v };
    };

    const eyeWhite = makeStamp(12, 15);
    const pupil = makeStamp(5, 6);
    const lid = makeStamp(12, 1.5);
    const browDot = makeStamp(2.4, 2);
    const mouthDot = makeStamp(2.6, 2.2);
    const openMouth = makeStamp(7, 6);
    const thoughtDot = makeStamp(2.4, 2);
    const cheekStamp = makeStamp(10, 7);

    const splat = (
      cx: number,
      cy: number,
      st: ReturnType<typeof makeStamp>,
      mult = 1,
    ) => {
      const gx = Math.round(cx * FIELD_SCALE_X);
      const gy = Math.round(cy * FIELD_SCALE_Y);
      for (let y = -st.ry; y <= st.ry; y++) {
        const fy = gy + y;
        if (fy < 0 || fy >= FIELD_ROWS) continue;
        const fr = fy * FIELD_COLS;
        const sr = (y + st.ry) * st.sx;
        for (let x = -st.rx; x <= st.rx; x++) {
          const fx = gx + x;
          if (fx < 0 || fx >= FIELD_COLS) continue;
          const sv = st.v[sr + x + st.rx]! * mult;
          if (sv <= 0) continue;
          field[fr + fx] = Math.min(1, field[fr + fx]! + sv);
        }
      }
    };

    // Arc of dots: sag > 0 → valley (U, like a smile), sag < 0 → hill (∩).
    const arc = (
      cx: number,
      cy: number,
      half: number,
      sag: number,
      st: ReturnType<typeof makeStamp>,
      n: number,
      mult = 1,
    ) => {
      for (let i = 0; i < n; i++) {
        const ti = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
        splat(cx + ti * half, cy + sag * (1 - ti * ti), st, mult);
      }
    };

    // Anchors (CANVAS px)
    const CX = CANVAS_W * 0.5;
    const EYE_DX = 35;
    const EYE_Y = CANVAS_H * 0.4;
    const BROW_Y = EYE_Y - 26;
    const BROW_HALF = 14;
    const MOUTH_Y = CANVAS_H * 0.74;
    const CHEEK_Y = EYE_Y + 42;

    // Mutable interpolated expression — starts at the current mood's preset.
    const cur: Expr = { ...EXPR[moodRef.current] };

    const drawBrow = (cx: number, e: Expr, ox: number, oy: number) => {
      const dir = cx < CX ? 1 : -1; // left eye: inner (nasal) end at larger x
      const innerX = cx + dir * BROW_HALF;
      const outerX = cx - dir * BROW_HALF;
      const innerY = BROW_Y + e.browY + e.browInner;
      const outerY = BROW_Y + e.browY + e.browOuter;
      const n = 5;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const x = innerX + (outerX - innerX) * t;
        const y = innerY + (outerY - innerY) * t;
        splat(x + ox, y + oy, browDot, 0.55);
      }
    };

    const drawEye = (cx: number, e: Expr, ox: number, oy: number) => {
      const open = e.eyeOpen;
      const ey = EYE_Y + oy;
      const ex = cx + ox;
      if (open < 0.14) {
        splat(ex, ey, lid, 0.95); // closed lid
      } else if (open < 0.62) {
        // Squint / joyful ^^ eye — a downward hill arc.
        arc(ex, ey, 10, -5, mouthDot, 7, 0.9);
      } else {
        // Open eye: faint white pool + bright pupil that follows the gaze.
        splat(ex, ey, eyeWhite, 0.3);
        const lx = Math.max(-7, Math.min(7, e.lookX));
        const ly = Math.max(-7, Math.min(7, e.lookY));
        splat(ex + lx, ey + ly, pupil, 1);
      }
    };

    let raf = 0;
    let running = true;
    let lastPaint = -Infinity;
    const t0 = performance.now();

    const paintFrame = (t: number) => {
      field.fill(0);

      const target = EXPR[moodRef.current];
      // Smoothly morph current expression toward the target preset.
      const k = 0.12;
      cur.browInner += (target.browInner - cur.browInner) * k;
      cur.browOuter += (target.browOuter - cur.browOuter) * k;
      cur.browY += (target.browY - cur.browY) * k;
      cur.eyeOpen += (target.eyeOpen - cur.eyeOpen) * k;
      cur.lookX += (target.lookX - cur.lookX) * k;
      cur.lookY += (target.lookY - cur.lookY) * k;
      cur.mouthCurve += (target.mouthCurve - cur.mouthCurve) * k;
      cur.mouthOpen += (target.mouthOpen - cur.mouthOpen) * k;
      cur.mouthY += (target.mouthY - cur.mouthY) * k;
      cur.mouthW += (target.mouthW - cur.mouthW) * k;
      cur.cheek += (target.cheek - cur.cheek) * k;

      // Idle life: breath bob, gentle sway, wandering gaze, periodic blink.
      const breath = Math.sin(t * 0.0016) * 1.2;
      const sway = Math.sin(t * 0.0009) * 1.4;
      const wanderX = Math.sin(t * 0.0007) * 3 + Math.sin(t * 0.0019) * 1.2;
      const wanderY = Math.sin(t * 0.0005) * 1.6;

      const blinkCycle = 3800;
      const blinkPhase = t % blinkCycle;
      const blinkF = blinkPhase < 150 ? 1 - Math.sin((blinkPhase / 150) * Math.PI) : 1;

      // Effective expression for this frame (idle motion layered on top).
      const e: Expr = {
        ...cur,
        eyeOpen: cur.eyeOpen * blinkF,
        lookX: cur.lookX + wanderX * 0.6,
        lookY: cur.lookY + wanderY * 0.6,
      };

      const ox = sway;
      const oy = breath;
      const isThinking = moodRef.current === "thinking";

      // Brows
      drawBrow(CX - EYE_DX, e, ox, oy);
      drawBrow(CX + EYE_DX, e, ox, oy);

      // Eyes
      drawEye(CX - EYE_DX, e, ox, oy);
      drawEye(CX + EYE_DX, e, ox, oy);

      // Cheeks / blush
      if (cur.cheek > 0.05) {
        const a = cur.cheek * 0.4;
        splat(CX - EYE_DX + ox, CHEEK_Y + oy, cheekStamp, a);
        splat(CX + EYE_DX + ox, CHEEK_Y + oy, cheekStamp, a);
      }

      // Mouth
      const mx = CX + ox;
      const my = MOUTH_Y + cur.mouthY + oy;
      arc(mx, my, cur.mouthW / 2, cur.mouthCurve, mouthDot, 11, 0.95);
      if (cur.mouthOpen > 0.6) {
        const om = Math.min(1, cur.mouthOpen / 7);
        splat(mx, my + cur.mouthCurve * 0.4, openMouth, 0.8 * om);
      }

      // Thinking: three thought dots rising to the upper-right, pulsing.
      if (isThinking) {
        for (let i = 0; i < 3; i++) {
          const phase = (t * 0.0011 + i * 0.33) % 1;
          const a = Math.max(0, Math.sin(phase * Math.PI));
          if (a <= 0.1) continue;
          const dx = CANVAS_W * (0.72 + i * 0.08);
          const dy = CANVAS_H * (0.2 - i * 0.05) + breath * 0.5;
          splat(dx, dy, thoughtDot, a);
        }
      }

      // Downsample brightness field → grid → glyph HTML (one innerHTML write).
      let html = "";
      const norm = FIELD_OVERSAMPLE * FIELD_OVERSAMPLE;
      for (let row = 0; row < ROWS; row++) {
        html += '<div class="af-row">';
        const fr = row * FIELD_OVERSAMPLE * FIELD_COLS;
        let emptyRun = 0;
        for (let col = 0; col < COLS; col++) {
          const fc = col * FIELD_OVERSAMPLE;
          let b = 0;
          for (let sy = 0; sy < FIELD_OVERSAMPLE; sy++) {
            const ro = fr + sy * FIELD_COLS + fc;
            for (let sx = 0; sx < FIELD_OVERSAMPLE; sx++) b += field[ro + sx]!;
          }
          const byte = Math.min(255, ((b / norm) * 255) | 0);
          const cell = cells[byte]!;
          if (cell.empty) {
            emptyRun++;
          } else {
            if (emptyRun > 0) {
              html += `<span class="af-e">${filler.repeat(emptyRun)}</span>`;
              emptyRun = 0;
            }
            html += `<span class="${cell.cls}">${cell.char}</span>`;
          }
        }
        if (emptyRun > 0) html += `<span class="af-e">${filler.repeat(emptyRun)}</span>`;
        html += "</div>";
      }
      box.innerHTML = html;
    };

    const tick = (now: number) => {
      if (now - lastPaint >= FPS_INTERVAL) {
        lastPaint = now;
        paintFrame(now - t0);
      }
      if (running && !reducedMotion) raf = requestAnimationFrame(tick);
    };

    if (reducedMotion) {
      // Static frame, no animation loop.
      paintFrame(0);
    } else {
      raf = requestAnimationFrame(tick);
    }
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  const width = size ? Math.min(size, BOX_W) : BOX_W;

  return (
    <div
      ref={boxRef}
      className="af-box"
      style={{ width, height: BOX_H, maxWidth: "100%" }}
      // A grid of weighted-glyph divs rendering an animated face — this is an
      // image conveyed through text, so role="img" + aria-label is correct.
      // There's no semantic HTML element for generated ASCII art.
      // oxlint-disable-next-line react-doctor/prefer-tag-over-role
      role="img"
      aria-label={
        mood === "thinking"
          ? "Strata Agent — thinking face"
          : mood === "excited"
            ? "Strata Agent — watching the pipeline run"
            : mood === "happy"
              ? "Strata Agent — happy face"
              : mood === "concerned"
                ? "Strata Agent — concerned face"
                : "Strata Agent — smiling face"
      }
    />
  );
}
