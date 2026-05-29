import type { CardData, TechKey } from "../../types";
import { TECH_META } from "../cards/cardTech";
import { generateId } from "../../utils/id";

export type CommandGroup = "stages" | "pipeline" | "agent" | "tech";

export interface PaletteCommand {
  id: string;
  /** Visible label */
  label: string;
  /** Group key for cmdk's <Command.Group> */
  group: CommandGroup;
  /** Right-aligned hint (shortcut or status) */
  hint?: string;
  /** True if execution should be blocked. cmdk still shows it, palette dims it. */
  disabled?: boolean;
  /** Keywords for cmdk fuzzy search (extra terms beyond label) */
  keywords?: string[];
  /** Inline glyph color used as a leading dot */
  accent?: string;
  /** Fires when the user picks the command. Palette closes itself afterwards. */
  run: () => void;
}

interface BuildCommandsArgs {
  // canvas state read-only snapshot
  hasSelection: boolean;
  selectedCardId: string | null;
  hasCards: boolean;
  // typed handlers
  addCard: (card: CardData) => void;
  startConnecting: (id: string) => void;
  deleteCard: (id: string) => void;
  // agent context bindings
  agentStatus: "idle" | "running" | "done" | "error";
  abortAgent: () => void;
  clearAgentLog: () => void;
  focusAgentInput: () => void;
  // pipeline runner bindings
  runPipeline: () => void;
  resetPipeline: () => void;
  isPipelineRunning: boolean;
  // viewport reset (centers + scale 1)
  resetViewport: () => void;
}

/**
 * Build the full command list given current state and handlers.
 * Pure function — re-evaluated on every render, no memoization required
 * since the palette only mounts when open.
 */
export function buildCommands(args: BuildCommandsArgs): PaletteCommand[] {
  const {
    hasSelection,
    selectedCardId,
    hasCards,
    addCard,
    startConnecting,
    deleteCard,
    agentStatus,
    abortAgent,
    clearAgentLog,
    focusAgentInput,
    runPipeline,
    resetPipeline,
    isPipelineRunning,
    resetViewport,
  } = args;

  const cmds: PaletteCommand[] = [
    // -------- Stages --------
    {
      id: "stage.add",
      group: "stages",
      label: "Add stage",
      hint: "A",
      keywords: ["create", "new", "card", "node"],
      run: () =>
        addCard({
          id: generateId(),
          position: { x: 200, y: 240 },
          size: { width: 260, height: 200 },
          title: "New Stage",
          connectedTo: [],
          tech: "terminal",
          runState: "idle",
        }),
    },
    {
      id: "stage.connect",
      group: "stages",
      label: "Start connecting from selected",
      hint: "C",
      keywords: ["link", "edge", "wire"],
      disabled: !hasSelection,
      run: () => {
        if (selectedCardId) startConnecting(selectedCardId);
      },
    },
    {
      id: "stage.delete",
      group: "stages",
      label: "Delete selected stage",
      hint: "Del",
      keywords: ["remove", "destroy"],
      disabled: !hasSelection,
      run: () => {
        if (selectedCardId) deleteCard(selectedCardId);
      },
    },

    // -------- Pipeline --------
    {
      id: "pipeline.run",
      group: "pipeline",
      label: "Run pipeline",
      hint: "R",
      keywords: ["execute", "play", "start", "all"],
      disabled: !hasCards || isPipelineRunning,
      run: runPipeline,
    },
    {
      id: "pipeline.reset",
      group: "pipeline",
      label: "Reset all stages",
      hint: "⇧R",
      keywords: ["clear", "idle"],
      disabled: !hasCards,
      run: resetPipeline,
    },
    {
      id: "view.reset",
      group: "pipeline",
      label: "Reset zoom & pan",
      hint: "0",
      keywords: ["zoom", "fit", "center", "viewport"],
      run: resetViewport,
    },

    // -------- Agent --------
    {
      id: "agent.focus",
      group: "agent",
      label: "Focus chat input",
      hint: "/",
      keywords: ["talk", "ask", "type", "message"],
      run: focusAgentInput,
    },
    {
      id: "agent.clear",
      group: "agent",
      label: "Clear chat history",
      keywords: ["reset", "wipe"],
      run: clearAgentLog,
    },
    {
      id: "agent.stop",
      group: "agent",
      label: "Stop agent",
      hint: "Esc",
      keywords: ["abort", "cancel"],
      disabled: agentStatus !== "running",
      run: abortAgent,
    },
  ];

  // -------- Tech filter — dynamic create-stage shortcuts --------
  const techKeys = Object.keys(TECH_META) as TechKey[];
  for (const tech of techKeys) {
    const meta = TECH_META[tech];
    cmds.push({
      id: `stage.add.${tech}`,
      group: "tech",
      label: `Create ${meta.label} stage`,
      keywords: [tech, meta.label.toLowerCase(), "add", "new"],
      accent: meta.color,
      run: () =>
        addCard({
          id: generateId(),
          position: { x: 200, y: 240 },
          size: { width: 260, height: 200 },
          title: defaultTitleFor(tech),
          connectedTo: [],
          tech,
          runState: "idle",
        }),
    });
  }

  return cmds;
}

function defaultTitleFor(tech: TechKey): string {
  switch (tech) {
    case "github":     return "Checkout Code";
    case "npm":        return "Install Dependencies";
    case "vite":       return "Build App";
    case "webpack":    return "Bundle";
    case "vitest":     return "Run Tests";
    case "eslint":     return "Lint";
    case "docker":     return "Build Image";
    case "kubernetes": return "Deploy to K8s";
    case "prometheus": return "Validate Alerts";
    case "terminal":   return "Run Step";
  }
}
