import type { WorkflowListItem } from "../lib/workflow-registry.js";
import { cn } from "../lib/utils.js";
import { ScopePill } from "./scope-pill.js";
import { StatusChip } from "./status-chip.js";

export const WORKFLOW_REGISTRY_GRID = "grid grid-cols-[minmax(0,1.6fr)_110px_72px_88px_100px] gap-2";

export type WorkflowRegistryRowProps = {
  readonly item: WorkflowListItem;
  readonly selected?: boolean;
  readonly onSelect?: (item: WorkflowListItem) => void;
  readonly className?: string;
};

/** One row in the combined live-runs-and-schedules list. Split from
 * `WorkflowRegistryList` so a caller building a different container
 * (virtualized, grouped some other way) can reuse the row on its own. */
export function WorkflowRegistryRow({ item, selected = false, onSelect, className }: WorkflowRegistryRowProps) {
  return (
    <button
      type="button"
      data-kind={item.itemKind}
      aria-selected={selected}
      onClick={() => onSelect?.(item)}
      className={cn(
        WORKFLOW_REGISTRY_GRID,
        "h-[46px] w-full items-center border-b border-border px-3.5 text-left transition-colors last:border-b-0 hover:bg-muted",
        selected && "bg-primary/10",
        item.needsYou === true && !selected && "bg-primary/5",
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{item.title}</span>
        {item.subtitle === undefined ? null : <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>}
      </span>
      <span className="truncate text-xs text-muted-foreground">{item.when}</span>
      <ScopePill scope={item.scope} />
      <StatusChip tone={item.statusTone} label={item.statusLabel} />
      <span className={cn("truncate font-mono text-[11.5px] text-muted-foreground", item.nextSoon === true && "font-semibold text-primary-emphasis")}>
        {item.nextOrElapsed}
      </span>
    </button>
  );
}
