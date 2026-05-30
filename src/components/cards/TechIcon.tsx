import type { TechKey } from "../../types";
import { TECH_META } from "./cardTech";

interface IconProps {
  size?: number;
}

/**
 * Inline SVG icons for each tech key — no external assets, no font deps.
 * Glyph shapes are deliberately simplified silhouettes that read at 20–24px.
 */
function GitHubGlyph({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2C6.48 2 2 6.58 2 12.22c0 4.51 2.87 8.34 6.84 9.68.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.7-2.79.62-3.38-1.36-3.38-1.36-.46-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.55 2.34 1.1 2.91.84.09-.66.35-1.1.63-1.36-2.22-.26-4.56-1.13-4.56-5.04 0-1.11.39-2.02 1.03-2.74-.1-.26-.45-1.3.1-2.7 0 0 .84-.27 2.75 1.05a9.4 9.4 0 015 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.74 0 3.92-2.34 4.78-4.57 5.03.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.81 0 .27.18.6.69.49A10.07 10.07 0 0022 12.22C22 6.58 17.52 2 12 2z"
        fill="currentColor"
      />
    </svg>
  );
}

function NpmGlyph({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="1.5" fill="currentColor" />
      <path d="M6 8h4v8H8v-6H6V8zm6 0h6v6h-2v-4h-1v4h-1v-4h-1v4h-1V8z" fill="#1a1a1a" />
    </svg>
  );
}

function ViteGlyph({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 4.7L12.6 21.5c-.3.5-1 .5-1.3 0L2 4.7c-.3-.5.1-1.1.7-1l9 1.6c.1 0 .2 0 .3 0l9-1.6c.6-.1 1 .5.7 1z"
        fill="currentColor"
      />
      <path d="M16.1 7.4l-4.7 1-.5 8.3L16.1 7.4z" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

function WebpackGlyph({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.3l7.4 3.7L12 11.7 4.6 8 12 4.3zm-8 5.4l7 3.5v7.4l-7-3.5V9.7zm16 0v7.4l-7 3.5v-7.4l7-3.5z" fill="currentColor" />
    </svg>
  );
}

function VitestGlyph({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-3z"
        fill="currentColor"
      />
      <path d="M9.5 12l2 2 4-4" stroke="#0c1116" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function EslintGlyph({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.3L18.7 8 12 11.7 5.3 8 12 4.3zM5 9.7l6 3.5v6.5l-6-3.5V9.7zm14 0v6.5l-6 3.5v-6.5l6-3.5z" fill="currentColor" />
    </svg>
  );
}

function DockerGlyph({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="11" width="3" height="3" fill="currentColor" />
      <rect x="6.5" y="11" width="3" height="3" fill="currentColor" />
      <rect x="10" y="11" width="3" height="3" fill="currentColor" />
      <rect x="6.5" y="7.5" width="3" height="3" fill="currentColor" />
      <rect x="10" y="7.5" width="3" height="3" fill="currentColor" />
      <rect x="10" y="4" width="3" height="3" fill="currentColor" />
      <path d="M21 13c-.5-1.5-2-2-3-1.5 0 0-.5 1 .5 2-1 1.5-4 4-9 4-3.6 0-6.5-1.5-7.5-3.5C2 17 5 19 9.5 19c5.6 0 9.5-2.6 11-5 .8.2 1.5 0 1.5-1z" fill="currentColor" />
    </svg>
  );
}

function KubernetesGlyph({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2l8.5 4v8L12 22 3.5 14V6L12 2z" fill="currentColor" />
      <circle cx="12" cy="11" r="3" fill="#0c1116" />
      <path d="M12 8v6M9 11h6M10 9l4 4M14 9l-4 4" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}

function PrometheusGlyph({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2c2.5 3 0 5 2 7s4 2 4 6c0 3.5-2.7 6-6 6s-6-2.5-6-6c0-2 1-3.5 2-4.5C9 9 8 7 12 2z" fill="currentColor" />
      <rect x="9" y="17.5" width="6" height="1.5" rx="0.5" fill="#0c1116" />
      <circle cx="12" cy="20.5" r="1" fill="#0c1116" />
    </svg>
  );
}

function TerminalGlyph({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M6 9l3 3-3 3M11 15h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const GLYPHS: Record<TechKey, (p: IconProps) => React.ReactElement> = {
  github: GitHubGlyph,
  npm: NpmGlyph,
  vite: ViteGlyph,
  webpack: WebpackGlyph,
  vitest: VitestGlyph,
  eslint: EslintGlyph,
  docker: DockerGlyph,
  kubernetes: KubernetesGlyph,
  prometheus: PrometheusGlyph,
  terminal: TerminalGlyph,
};

interface TechIconProps {
  tech: TechKey;
  size?: number;
  /** Render with the background chip; off for cases where you want just the glyph. */
  chip?: boolean;
}

export function TechIcon({ tech, size = 18, chip = true }: TechIconProps) {
  const meta = TECH_META[tech];
  const Glyph = GLYPHS[tech];

  if (!chip) {
    return (
      <span style={{ color: meta.color, display: "inline-flex" }} aria-label={meta.label}>
        <Glyph size={size} />
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center rounded-md flex-shrink-0"
      style={{
        width: size + 12,
        height: size + 12,
        background: meta.tint,
        color: meta.color,
      }}
      aria-label={meta.label}
    >
      <Glyph size={size} />
    </span>
  );
}
