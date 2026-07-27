import { useCollectionState } from "../hooks/use-collection-state.js";
import type { CollectionRequest } from "../lib/data-port.js";
import { formatRelativeTime } from "../lib/relative-time.js";
import { cn } from "../lib/utils.js";
import {
  isActiveRun,
  RUN_STATUS_DOT_TONE,
  RUN_STATUS_LABEL,
  RUN_STATUS_TONE,
  sortRunsByAttention,
  type WorkflowRunSummary,
} from "../lib/workflow-run.js";
import { Badge } from "./badge.js";
import { StatusDot } from "./status-dot.js";

export type WorkflowDockProps = {
  /** The runs collection, resolved by whatever DataPort is in scope. */
  readonly request: CollectionRequest<WorkflowRunSummary>;
  readonly selectedId?: string | null;
  readonly onSelect?: (run: WorkflowRunSummary) => void;
  /** Show finished runs too. Off by default — the dock is for work in flight. */
  readonly includeTerminal?: boolean;
  readonly now?: number;
  readonly className?: string;
};

/**
 * The active-runs strip: what is in flight, and which of it is waiting on you.
 *
 * Renders nothing when there is nothing running. That is not a missing empty
 * state — the dock sits above a page that has its own primary content, and an
 * empty strip saying "no active runs" is a permanent piece of furniture
 * reporting the normal case. The same silence covers loading, because a strip
 * that flashes a skeleton on every poll is worse than one that appears when it
 * has something to say.
 *
 * A run's *contents* are not here. This lists runs by status, identity and
 * timing; rendering what a run produced is a separate contract.
 */
export function WorkflowDock({
  request,
  selectedId = null,
  onSelect,
  includeTerminal = false,
  now,
  className,
}: WorkflowDockProps) {
  const { state, isFetching } = useCollectionState(request);

  if (state.status !== "ready") return null;

  const runs = sortRunsByAttention(
    includeTerminal ? state.items : state.items.filter((run) => isActiveRun(run.status)),
  );
  if (runs.length === 0) return null;

  return (
    <section aria-label="Active runs" aria-busy={isFetching} className={cn("flex flex-col gap-2", className)}>
      <h2 className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">Active runs</h2>
      <ul className="flex flex-col gap-0.5">
        {runs.map((run) => {
          const selected = run.runId === selectedId;
          const body = (
            <>
              <StatusDot
                label={RUN_STATUS_LABEL[run.status]}
                tone={RUN_STATUS_DOT_TONE[run.status]}
                live={run.status === "running" || run.status === "provisioning"}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{run.title}</span>
              <time dateTime={run.startedAt} className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {formatRelativeTime(run.startedAt, now)}
              </time>
              <Badge tone={RUN_STATUS_TONE[run.status]}>{RUN_STATUS_LABEL[run.status]}</Badge>
            </>
          );
          const shell = cn(
            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
            selected ? "bg-primary/10" : "hover:bg-muted",
          );

          return (
            <li key={run.runId}>
              {onSelect === undefined ? (
                <a href={run.href ?? "#"} aria-current={selected ? "true" : undefined} className={shell}>
                  {body}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(run)}
                  aria-current={selected ? "true" : undefined}
                  className={shell}
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
