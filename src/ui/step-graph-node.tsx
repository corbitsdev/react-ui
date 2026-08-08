import { cn } from "../lib/utils.js";

export type StepGraphNodeKind = "auto" | "agent" | "human";
export type StepGraphNodeStatus = "pending" | "running" | "completed" | "failed";

const KIND_LABEL: Record<StepGraphNodeKind, string> = {
  auto: "Automated",
  agent: "AI agent",
  human: "Your input",
};

const KIND_GLYPH: Record<StepGraphNodeKind, string> = { auto: "●", agent: "◆", human: "★" };

// Kind colours: auto stays neutral ink, agent takes the info blue, human
// takes the accent orange that marks "needs a person" everywhere else in the
// registry — the same three-way split the status badge's tones draw on.
const CHIP_CLASS: Record<StepGraphNodeKind, string> = {
  auto: "border-border bg-card",
  agent: "border-accent bg-accent/40",
  human: "border-primary-emphasis/50 bg-primary/10",
};

const BADGE_CLASS: Record<StepGraphNodeKind, string> = {
  auto: "text-muted-foreground",
  agent: "text-accent-foreground",
  human: "text-primary-emphasis",
};

const STATUS_RING_CLASS: Record<StepGraphNodeStatus, string> = {
  completed: "ring-2 ring-success/70",
  running: "ring-2 ring-primary-emphasis",
  failed: "ring-2 ring-destructive",
  pending: "ring-1 ring-input",
};

function statusGlyph(status: StepGraphNodeStatus | undefined): string | null {
  if (status === "completed") return "✓";
  if (status === "failed") return "!";
  if (status === "running") return "…";
  return null;
}

export type StepGraphNodeProps = {
  readonly title: string;
  readonly kind: StepGraphNodeKind;
  readonly status?: StepGraphNodeStatus;
  readonly index: number;
  readonly width: number;
  readonly minHeight: number;
  readonly left: number;
  readonly top: number;
  readonly className?: string;
};

/** One node in the step graph, absolutely positioned by the caller's layout
 * math. Kept apart from the graph itself so a caller wanting a single node
 * preview (a hover card, say) can render exactly this. */
export function StepGraphNode({ title, kind, status, index, width, minHeight, left, top, className }: StepGraphNodeProps) {
  const mark = statusGlyph(status);
  return (
    <li
      className={cn(
        "absolute flex items-center gap-2.5 rounded-lg border px-2.5 py-2",
        CHIP_CLASS[kind],
        status === undefined ? "" : STATUS_RING_CLASS[status],
        className,
      )}
      style={{ width, minHeight, left, top }}
    >
      <span aria-hidden className="relative grid size-7 shrink-0 place-items-center rounded-md border border-border bg-card text-[10px] font-bold tabular-nums">
        {mark ?? index + 1}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[12.5px] font-semibold leading-tight">{title}</span>
        <span className={cn("flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.05em]", BADGE_CLASS[kind])}>
          <span aria-hidden>{KIND_GLYPH[kind]}</span>
          {KIND_LABEL[kind]}
        </span>
      </div>
    </li>
  );
}
