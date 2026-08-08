import { cn } from "../lib/utils.js";
import { WORKFLOW_REGISTRY_GRID } from "./workflow-registry-row.js";

export type WorkflowRegistryHeadProps = {
  readonly className?: string;
  readonly columns?: readonly [string, string, string, string, string];
};

/** The sticky column-label row above the list. */
export function WorkflowRegistryHead({
  className,
  columns = ["Workflow", "When", "Scope", "Status", "Next"],
}: WorkflowRegistryHeadProps) {
  return (
    <div
      className={cn(
        WORKFLOW_REGISTRY_GRID,
        "sticky top-0 z-10 shrink-0 border-b border-border bg-muted/60 px-3.5 py-2 text-[10.5px] font-bold uppercase tracking-[0.05em] text-muted-foreground",
        className,
      )}
    >
      {columns.map((column) => (
        <span key={column}>{column}</span>
      ))}
    </div>
  );
}

export type WorkflowRegistrySectionHeaderProps = {
  readonly title: string;
  readonly count?: number;
  readonly className?: string;
};

/** A "Live" / "Scheduled" group divider inside the list. */
export function WorkflowRegistrySectionHeader({ title, count, className }: WorkflowRegistrySectionHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 border-b border-border bg-muted/80 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-muted-foreground",
        className,
      )}
    >
      {count === undefined ? title : `${title} · ${count}`}
    </div>
  );
}
