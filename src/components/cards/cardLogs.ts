import type { CustomLogLine, LogKind, TechKey } from "../../types";

export type { LogKind };

export interface LogLine {
  text: string;
  kind: LogKind;
  /** Milliseconds to wait before showing this line (from previous line). */
  delayMs: number;
}

/** Default pacing used for custom_logs that come from the agent (no delayMs). */
const CUSTOM_LINE_DELAY_MS = 200;

interface Template {
  cmd: string;
  body: LogLine[];
  durationRange: [number, number];
}

const TEMPLATES: Record<TechKey, Template> = {
  github: {
    cmd: "git checkout main && git pull --rebase origin main",
    body: [
      { text: "Switched to branch 'main'",                                                            kind: "dim",     delayMs: 80 },
      { text: "Your branch is up to date with 'origin/main'",                                         kind: "dim",     delayMs: 120 },
      { text: "remote: Enumerating objects: 47, done.",                                               kind: "info",    delayMs: 180 },
      { text: "remote: Counting objects: 100% (47/47), done.",                                        kind: "info",    delayMs: 140 },
      { text: "remote: Compressing objects: 100% (28/28), done.",                                     kind: "info",    delayMs: 120 },
      { text: "remote: Total 47 (delta 29), reused 36 (delta 18), pack-reused 0",                    kind: "info",    delayMs: 140 },
      { text: "Receiving objects: 100% (47/47), 12.42 KiB | 4.14 MiB/s, done.",                       kind: "info",    delayMs: 220 },
      { text: "Resolving deltas: 100% (29/29), completed with 11 local objects.",                     kind: "info",    delayMs: 180 },
      { text: "From github.com:strata/sos",                                                           kind: "dim",     delayMs: 120 },
      { text: "   a3b2c41..d4e5f7a  main       -> origin/main",                                       kind: "info",    delayMs: 140 },
      { text: "First, rewinding head to replay your work on top of it…",                              kind: "dim",     delayMs: 160 },
      { text: "Fast-forwarded main to d4e5f7a.",                                                      kind: "info",    delayMs: 180 },
      { text: " 6 files changed, 84 insertions(+), 12 deletions(-)",                                  kind: "info",    delayMs: 100 },
      { text: "✓ HEAD is now at d4e5f7a chore(deps): bump react to 19.2.5",                           kind: "success", delayMs: 160 },
    ],
    durationRange: [2200, 3400],
  },
  npm: {
    cmd: "pnpm install --frozen-lockfile",
    body: [
      { text: "Lockfile is up to date, resolution step is skipped",                                   kind: "dim",     delayMs: 140 },
      { text: "Importers:",                                                                           kind: "dim",     delayMs: 120 },
      { text: " . (root)",                                                                            kind: "info",    delayMs: 100 },
      { text: "Packages: +247",                                                                       kind: "info",    delayMs: 200 },
      { text: "+++++++++++++++++++++++++++++++++++++++++++++++",                                      kind: "dim",     delayMs: 120 },
      { text: "Progress: resolved 247, reused 247, downloaded 0, added 0",                            kind: "info",    delayMs: 240 },
      { text: "Packages are hard linked from the content-addressable store",                          kind: "dim",     delayMs: 160 },
      { text: "                                                                                  ",   kind: "dim",     delayMs: 60 },
      { text: "devDependencies:",                                                                     kind: "info",    delayMs: 100 },
      { text: "+ @playwright/test 1.60.0",                                                            kind: "info",    delayMs: 80 },
      { text: "+ @testing-library/react 16.3.2",                                                      kind: "info",    delayMs: 80 },
      { text: "+ typescript 6.0.2",                                                                   kind: "info",    delayMs: 80 },
      { text: "+ vite 8.0.10",                                                                        kind: "info",    delayMs: 80 },
      { text: "+ vitest 4.1.5",                                                                       kind: "info",    delayMs: 80 },
      { text: "Done in 1.6s using pnpm v10.33.0",                                                     kind: "success", delayMs: 180 },
    ],
    durationRange: [2400, 3600],
  },
  vite: {
    cmd: "vite build --mode production",
    body: [
      { text: "vite v8.0.10 building for production…",                                                kind: "dim",     delayMs: 160 },
      { text: "✓ Loaded config from vite.config.ts",                                                  kind: "dim",     delayMs: 140 },
      { text: "✓ Detected Tailwind CSS v4 plugin",                                                    kind: "dim",     delayMs: 120 },
      { text: "transforming…",                                                                        kind: "info",    delayMs: 180 },
      { text: "  src/main.tsx                            1.24 kB",                                    kind: "dim",     delayMs: 80 },
      { text: "  src/App.tsx                             0.86 kB",                                    kind: "dim",     delayMs: 70 },
      { text: "  src/components/canvas/DrawboardCanvas  12.41 kB",                                    kind: "dim",     delayMs: 80 },
      { text: "  src/agent/harness.ts                    4.78 kB",                                    kind: "dim",     delayMs: 80 },
      { text: "  src/pretext/useLogReflow.ts             3.12 kB",                                    kind: "dim",     delayMs: 70 },
      { text: "✓ 247 modules transformed in 1.18s",                                                   kind: "info",    delayMs: 240 },
      { text: "rendering chunks…",                                                                    kind: "dim",     delayMs: 180 },
      { text: "computing gzip size…",                                                                 kind: "dim",     delayMs: 120 },
      { text: "dist/index.html                       0.45 kB │ gzip:  0.31 kB",                       kind: "info",    delayMs: 100 },
      { text: "dist/assets/index-a3b2c.css          18.42 kB │ gzip:  4.10 kB",                       kind: "info",    delayMs: 80 },
      { text: "dist/assets/vendor-d4e5f.js          89.21 kB │ gzip: 28.40 kB",                       kind: "info",    delayMs: 80 },
      { text: "dist/assets/index-9f8b7.js          142.74 kB │ gzip: 47.31 kB",                       kind: "info",    delayMs: 80 },
      { text: "✓ built in 1.42s",                                                                     kind: "success", delayMs: 180 },
    ],
    durationRange: [2600, 3800],
  },
  webpack: {
    cmd: "webpack --mode production --progress",
    body: [
      { text: "[webpack-cli] Compiling 'main'…",                                                      kind: "dim",     delayMs: 160 },
      { text: " 10% building 0/1 entries 0/0 dependencies 0/0 modules",                               kind: "dim",     delayMs: 200 },
      { text: " 40% building 1/1 entries 138/213 dependencies 142/213 modules",                       kind: "dim",     delayMs: 280 },
      { text: " 78% building 1/1 entries 213/213 dependencies 213/213 modules",                       kind: "dim",     delayMs: 320 },
      { text: " 92% sealing additional asset processing",                                             kind: "dim",     delayMs: 140 },
      { text: " 96% emitting CopyPlugin",                                                             kind: "dim",     delayMs: 120 },
      { text: "asset main.js 168 KiB [emitted] [minimized] (name: main)",                             kind: "info",    delayMs: 180 },
      { text: "asset vendor.js 312 KiB [emitted] [minimized] (name: vendor)",                         kind: "info",    delayMs: 120 },
      { text: "asset styles.css 22 KiB [emitted]",                                                    kind: "info",    delayMs: 100 },
      { text: "asset index.html 1.2 KiB [emitted]",                                                   kind: "info",    delayMs: 80 },
      { text: "Entrypoint main 502 KiB = vendor.js 312 KiB main.js 168 KiB styles.css 22 KiB",        kind: "info",    delayMs: 180 },
      { text: "webpack 5.94.0 compiled successfully in 2148 ms",                                      kind: "success", delayMs: 200 },
    ],
    durationRange: [2800, 4200],
  },
  vitest: {
    cmd: "vitest run --coverage",
    body: [
      { text: "RUN  v3.0.5 /workspace/strata",                                                        kind: "dim",     delayMs: 160 },
      { text: "",                                                                                     kind: "dim",     delayMs: 80 },
      { text: " ✓ src/tests/useBubbleLayout.test.ts  (3)",                                            kind: "success", delayMs: 200 },
      { text: " ✓ src/tests/useTextReflow.test.ts  (3)",                                              kind: "success", delayMs: 180 },
      { text: " ✓ src/tests/useLogReflow.test.ts  (4)",                                               kind: "success", delayMs: 180 },
      { text: " ✓ src/tests/transaction.test.ts  (7)",                                                kind: "success", delayMs: 200 },
      { text: " ✓ src/tests/Card.test.tsx  (7)",                                                      kind: "success", delayMs: 220 },
      { text: " ✓ src/tests/harness.test.ts  (27)",                                                   kind: "success", delayMs: 280 },
      { text: "",                                                                                     kind: "dim",     delayMs: 80 },
      { text: " Test Files  6 passed (6)",                                                            kind: "info",    delayMs: 140 },
      { text: "      Tests  51 passed (51)",                                                          kind: "info",    delayMs: 120 },
      { text: "   Start at  09:42:18",                                                                kind: "dim",     delayMs: 80 },
      { text: "   Duration  3.41s (transform 482ms, setup 668ms, tests 712ms)",                       kind: "info",    delayMs: 140 },
      { text: " % Coverage:  statements 94.2  │  branches 87.8  │  functions 91.3  │  lines 94.0",    kind: "info",    delayMs: 180 },
      { text: "✓ all tests passed",                                                                   kind: "success", delayMs: 160 },
    ],
    durationRange: [2400, 3600],
  },
  eslint: {
    cmd: "eslint src --ext .ts,.tsx --max-warnings 0",
    body: [
      { text: "Linting 138 files in src/…",                                                           kind: "dim",     delayMs: 200 },
      { text: "  scanning src/agent/                  18 files",                                      kind: "dim",     delayMs: 140 },
      { text: "  scanning src/components/             62 files",                                      kind: "dim",     delayMs: 160 },
      { text: "  scanning src/context/                 4 files",                                      kind: "dim",     delayMs: 100 },
      { text: "  scanning src/hooks/                   8 files",                                      kind: "dim",     delayMs: 100 },
      { text: "  scanning src/pretext/                 5 files",                                      kind: "dim",     delayMs: 100 },
      { text: "  scanning src/tests/                  16 files",                                      kind: "dim",     delayMs: 120 },
      { text: "  scanning src/utils/                   3 files",                                      kind: "dim",     delayMs: 100 },
      { text: "Applied 0 auto-fixes",                                                                 kind: "info",    delayMs: 160 },
      { text: "✓ no problems found in 138 files",                                                     kind: "success", delayMs: 220 },
    ],
    durationRange: [1600, 2400],
  },
  docker: {
    cmd: "docker build -t strata:latest . && docker push",
    body: [
      { text: "[+] Building 12.4s (14/14) FINISHED",                                                  kind: "dim",     delayMs: 180 },
      { text: " => [internal] load build definition from Dockerfile           0.0s",                  kind: "info",    delayMs: 140 },
      { text: " => => transferring dockerfile: 612B                            0.0s",                  kind: "dim",     delayMs: 80 },
      { text: " => [internal] load .dockerignore                              0.0s",                  kind: "info",    delayMs: 100 },
      { text: " => [internal] load metadata for node:20-alpine                0.4s",                  kind: "info",    delayMs: 140 },
      { text: " => CACHED [1/6] FROM node:20-alpine@sha256:a3b2c1d4…           0.0s",                  kind: "dim",     delayMs: 100 },
      { text: " => [2/6] WORKDIR /app                                          0.0s",                  kind: "info",    delayMs: 80 },
      { text: " => [3/6] COPY package.json pnpm-lock.yaml ./                   0.0s",                  kind: "info",    delayMs: 100 },
      { text: " => [4/6] RUN corepack enable && pnpm i --prod                  3.8s",                  kind: "info",    delayMs: 240 },
      { text: " => [5/6] COPY . .                                              0.2s",                  kind: "info",    delayMs: 120 },
      { text: " => [6/6] RUN pnpm build                                        2.4s",                  kind: "info",    delayMs: 200 },
      { text: " => exporting to image                                          0.3s",                  kind: "info",    delayMs: 140 },
      { text: " => => writing image sha256:d4e5f7a3b2c10a1b2c3d4e5f6a7b8c9d…   0.0s",                  kind: "dim",     delayMs: 80 },
      { text: "The push refers to repository [registry.strata.io/strata]",                            kind: "info",    delayMs: 160 },
      { text: "d4e5f7a3b2c1: Pushed",                                                                 kind: "info",    delayMs: 180 },
      { text: "latest: digest: sha256:9f8b7a6c5d4e3f2a1b0c9d8e7f6a5b4c size: 1583",                   kind: "info",    delayMs: 140 },
      { text: "✓ pushed strata:latest (image 148 MB)",                                                kind: "success", delayMs: 180 },
    ],
    durationRange: [3200, 4600],
  },
  kubernetes: {
    cmd: "kubectl apply -f k8s/ && kubectl rollout status deploy/strata",
    body: [
      { text: "deployment.apps/strata configured",                                                    kind: "info",    delayMs: 160 },
      { text: "service/strata unchanged",                                                             kind: "dim",     delayMs: 120 },
      { text: "configmap/strata-env configured",                                                      kind: "info",    delayMs: 120 },
      { text: "horizontalpodautoscaler.autoscaling/strata-hpa configured",                            kind: "info",    delayMs: 140 },
      { text: "ingress.networking.k8s.io/strata-ingress configured",                                  kind: "info",    delayMs: 140 },
      { text: "",                                                                                     kind: "dim",     delayMs: 80 },
      { text: "Waiting for deployment 'strata' rollout to finish:",                                   kind: "dim",     delayMs: 220 },
      { text: "  0 of 3 updated replicas are available…",                                             kind: "info",    delayMs: 320 },
      { text: "  1 of 3 updated replicas are available…",                                             kind: "info",    delayMs: 360 },
      { text: "  2 of 3 updated replicas are available…",                                             kind: "info",    delayMs: 320 },
      { text: "Waiting for old replicas to terminate (2 remaining)",                                  kind: "dim",     delayMs: 240 },
      { text: "Waiting for old replicas to terminate (1 remaining)",                                  kind: "dim",     delayMs: 220 },
      { text: "deployment 'strata' successfully rolled out",                                          kind: "info",    delayMs: 200 },
      { text: "✓ 3/3 replicas ready, serving traffic at https://strata.io",                           kind: "success", delayMs: 220 },
    ],
    durationRange: [3000, 4400],
  },
  prometheus: {
    cmd: "promtool check rules alerts.yml && promtool test rules tests/",
    body: [
      { text: "Checking alerts.yml…",                                                                 kind: "dim",     delayMs: 180 },
      { text: "  Loaded 14 rule files, 47 rules total",                                               kind: "info",    delayMs: 200 },
      { text: "  Group 'sla'           — 8 rules valid",                                              kind: "info",    delayMs: 140 },
      { text: "  Group 'errors'        — 12 rules valid",                                             kind: "info",    delayMs: 140 },
      { text: "  Group 'latency'       — 9 rules valid",                                              kind: "info",    delayMs: 140 },
      { text: "  Group 'infrastructure' — 18 rules valid",                                            kind: "info",    delayMs: 140 },
      { text: "SUCCESS: rules ok",                                                                    kind: "info",    delayMs: 200 },
      { text: "",                                                                                     kind: "dim",     delayMs: 80 },
      { text: "Running test cases from tests/…",                                                      kind: "dim",     delayMs: 180 },
      { text: "  tests/high_error_rate.yml        ✓ 3/3 cases passed",                                kind: "success", delayMs: 200 },
      { text: "  tests/latency_breach.yml         ✓ 2/2 cases passed",                                kind: "success", delayMs: 180 },
      { text: "  tests/disk_pressure.yml          ✓ 4/4 cases passed",                                kind: "success", delayMs: 200 },
      { text: "✓ all 47 alerting rules valid, 9/9 test cases passed",                                 kind: "success", delayMs: 220 },
    ],
    durationRange: [2000, 3000],
  },
  terminal: {
    cmd: "./scripts/run-step.sh",
    body: [
      { text: "→ executing step…",                                                                    kind: "dim",     delayMs: 180 },
      { text: "  loading environment from .env",                                                      kind: "dim",     delayMs: 160 },
      { text: "  resolved 4 dependencies",                                                            kind: "info",    delayMs: 200 },
      { text: "  running pre-checks…",                                                                kind: "dim",     delayMs: 220 },
      { text: "  ✓ pre-checks passed",                                                                kind: "info",    delayMs: 240 },
      { text: "  executing main task…",                                                               kind: "info",    delayMs: 320 },
      { text: "  task completed in 1.84s",                                                            kind: "info",    delayMs: 220 },
      { text: "✓ step finished successfully",                                                         kind: "success", delayMs: 200 },
    ],
    durationRange: [1800, 2800],
  },
};

export function getTemplate(tech: TechKey): Template {
  return TEMPLATES[tech] ?? TEMPLATES.terminal;
}

/**
 * Build the full ordered log lines for a card.
 *
 * If `customLogs` is provided and non-empty, the agent has overridden the
 * stage's output — we honour those lines verbatim (with a uniform cadence
 * so the user doesn't have to spec timing).
 *
 * Otherwise we fall back to the tech template (cmd + body).
 */
export function buildLogLines(tech: TechKey, customLogs?: CustomLogLine[]): LogLine[] {
  if (customLogs && customLogs.length > 0) {
    return customLogs.map((line) => ({
      text: line.text,
      kind: line.kind,
      delayMs: CUSTOM_LINE_DELAY_MS,
    }));
  }
  const t = getTemplate(tech);
  return [{ text: t.cmd, kind: "cmd", delayMs: 60 }, ...t.body];
}

/** Pick a duration within the tech's natural range (deterministic-ish by id seed). */
export function pickDuration(tech: TechKey, seed: string): number {
  const [lo, hi] = getTemplate(tech).durationRange;
  // Cheap deterministic hash so the same card always shows the same duration.
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const t = Math.abs(h) / 0x7fffffff;
  return Math.round(lo + (hi - lo) * t);
}
