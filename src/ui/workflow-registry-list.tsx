import type { ReactNode } from "react";

import type { WorkflowListItem } from "../lib/workflow-registry.js";
import { cn } from "../lib/utils.js";
import { EmptyState } from "./empty-state.js";
import { WorkflowRegistryHead, WorkflowRegistrySectionHeader } from "./workflow-registry-section.js";
import { WorkflowRegistryRow } from "./workflow-registry-row.js";

export type WorkflowRegistryListProps = {
  readonly live: readonly WorkflowListItem[];
  readonly scheduled: readonly WorkflowListItem[];
  readonly selectedId?: string | null;
  readonly selectedKind?: "run" | "schedule" | null;
  readonly onSelect?: (item: WorkflowListItem) => void;
  readonly empty?: ReactNode;
  readonly className?: string;
  readonly showHead?: boolean;
};

/**
 * The combined live-runs-and-schedules registry: a thin composition of
 * `WorkflowRegistryHead`, `WorkflowRegistrySectionHeader` and
 * `WorkflowRegistryRow`. Each of those renders standalone — this component
 * only decides which sections exist and which row is selected.
 */
export function WorkflowRegistryList({
  live,
  scheduled,
  selectedId = null,
  selectedKind = null,
  onSelect,
  empty,
  className,
  showHead = true,
}: WorkflowRegistryListProps) {
  const hasRows = live.length > 0 || scheduled.length > 0;

  return (
    <div aria-label="Workflows" className={cn("flex min-h-0 min-w-0 flex-col", className)}>
      {showHead ? <WorkflowRegistryHead /> : null}
      {!hasRows ? (
        <div className="min-h-0 flex-1 overflow-auto">{empty ?? <EmptyState title="No workflows match these filters" />}</div>
      ) : (
        <ul className="min-h-0 flex-1 list-none overflow-auto">
          {live.length === 0 ? null : (
            <>
              <li>
                <WorkflowRegistrySectionHeader title="Live" count={live.length} />
              </li>
              {live.map((item) => (
                <li key={item.id}>
                  <WorkflowRegistryRow item={item} selected={selectedKind === "run" && selectedId === item.id} onSelect={onSelect} />
                </li>
              ))}
            </>
          )}
          {scheduled.length === 0 ? null : (
            <>
              <li>
                <WorkflowRegistrySectionHeader title="Scheduled" count={scheduled.length} />
              </li>
              {scheduled.map((item) => (
                <li key={item.id}>
                  <WorkflowRegistryRow
                    item={item}
                    selected={selectedKind === "schedule" && selectedId === item.id}
                    onSelect={onSelect}
                  />
                </li>
              ))}
            </>
          )}
        </ul>
      )}
    </div>
  );
}
