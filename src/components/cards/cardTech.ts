import type { TechKey } from "../../types";

export interface TechMeta {
  key: TechKey;
  label: string;
  color: string;
  /** Background tint for the icon chip (low-alpha tint of `color`). */
  tint: string;
}

export const TECH_META: Record<TechKey, TechMeta> = {
  github:     { key: "github",     label: "GitHub",     color: "#e6e6e6", tint: "rgba(230,230,230,0.10)" },
  npm:        { key: "npm",        label: "npm",        color: "#cb3837", tint: "rgba(203,56,55,0.14)" },
  vite:       { key: "vite",       label: "Vite",       color: "#9c6bff", tint: "rgba(156,107,255,0.16)" },
  webpack:    { key: "webpack",    label: "webpack",    color: "#5fa9d9", tint: "rgba(95,169,217,0.16)" },
  vitest:     { key: "vitest",     label: "Vitest",     color: "#7dd87d", tint: "rgba(125,216,125,0.16)" },
  eslint:     { key: "eslint",     label: "ESLint",     color: "#a48cff", tint: "rgba(164,140,255,0.16)" },
  docker:     { key: "docker",     label: "Docker",     color: "#5fb4ff", tint: "rgba(95,180,255,0.16)" },
  kubernetes: { key: "kubernetes", label: "Kubernetes", color: "#7ea6ff", tint: "rgba(126,166,255,0.16)" },
  prometheus: { key: "prometheus", label: "Prometheus", color: "#ff8e5e", tint: "rgba(255,142,94,0.16)" },
  terminal:   { key: "terminal",   label: "Shell",      color: "#9aa3b2", tint: "rgba(154,163,178,0.14)" },
};

/** Detect tech from title keywords. Falls back to `terminal`. */
export function detectTech(title: string): TechKey {
  const t = title.toLowerCase();
  if (/\b(checkout|clone|pull|git|fetch)\b/.test(t)) return "github";
  if (/\b(install|deps|dependencies|npm|pnpm|yarn)\b/.test(t)) return "npm";
  if (/\b(vite)\b/.test(t)) return "vite";
  if (/\b(webpack|bundle)\b/.test(t)) return "webpack";
  if (/\b(build|compile|app)\b/.test(t)) return "vite";
  if (/\b(test|jest|vitest|spec|unit|e2e|integration)\b/.test(t)) return "vitest";
  if (/\b(lint|eslint|prettier|format)\b/.test(t)) return "eslint";
  if (/\b(docker|image|dockerize|container|push|registry)\b/.test(t)) return "docker";
  if (/\b(deploy|k8s|kube|kubernetes|helm|rollout)\b/.test(t)) return "kubernetes";
  if (/\b(monitor|metric|prometheus|grafana|alert)\b/.test(t)) return "prometheus";
  return "terminal";
}
