import type { ReactNode } from "react";

import type { WorkflowScope } from "../lib/workflow-registry.js";
import { Button } from "./button.js";
import { InspectorHeader, InspectorKv, InspectorPanelTitle, InspectorShell } from "./inspector-shell.js";
import { ReadBlock } from "./read-block.js";
import { ScopePill } from "./scope-pill.js";
import { StatusChip } from "./status-chip.js";

export type ScheduleInspectorViewProps = {
  readonly enabled: boolean;
  readonly scope: WorkflowScope;
  readonly title: string;
  readonly description?: string;
  readonly cadence: string;
  readonly next?: string;
  readonly last?: string;
  readonly name?: string;
  readonly scheduleId?: string;
  /** Rendered under the details block — a recent-runs list from the caller. */
  readonly recentRuns?: ReactNode;
  readonly onEdit?: () => void;
  readonly onRunNow?: () => void;
  readonly onTogglePause?: () => void;
  readonly className?: string;
  readonly empty?: ReactNode;
};

/**
 * A schedule's inspector, composed the same way as `LiveRunInspector`:
 * `InspectorShell` for the frame, `StatusChip`/`ScopePill` for the header
 * chips, `ReadBlock`/`InspectorKv` for the read-only facts.
 */
export function ScheduleInspectorView({
  enabled,
  scope,
  title,
  description,
  cadence,
  next,
  last,
  name,
  scheduleId,
  recentRuns,
  onEdit,
  onRunNow,
  onTogglePause,
  className,
  empty,
}: ScheduleInspectorViewProps) {
  if (empty !== undefined) {
    return <InspectorShell empty={empty} className={className} />;
  }

  const cadenceSub = [next === undefined ? null : `Next ${next}`, last === undefined ? null : `last ${last}`]
    .filter((part): part is string => part !== null)
    .join(" · ");

  return (
    <InspectorShell
      className={className}
      header={
        <InspectorHeader
          eyebrow={
            <>
              <StatusChip tone={enabled ? "running" : "paused"} label={enabled ? "Active" : "Paused"} live={enabled} />
              <ScopePill scope={scope} />
            </>
          }
          title={title}
          description={description}
          actions={
            <>
              {onEdit === undefined ? null : (
                <Button size="sm" onClick={onEdit}>
                  Edit
                </Button>
              )}
              {onRunNow === undefined ? null : (
                <Button variant="outline" size="sm" onClick={onRunNow}>
                  Run now
                </Button>
              )}
              {onTogglePause === undefined ? null : (
                <Button variant="outline" size="sm" onClick={onTogglePause}>
                  {enabled ? "Pause" : "Resume"}
                </Button>
              )}
            </>
          }
        />
      }
    >
      <InspectorPanelTitle>Overview</InspectorPanelTitle>
      <ReadBlock label="Cadence" value={cadence} mono sub={cadenceSub === "" ? undefined : cadenceSub} />

      <InspectorPanelTitle>Details</InspectorPanelTitle>
      <InspectorKv
        rows={[
          { label: "Name", value: name?.trim() ? name : "Default (workflow name)" },
          { label: "Scope", value: scope === "tenant" ? "Everyone" : "Just me" },
        ]}
      />

      {recentRuns}

      {scheduleId === undefined && last === undefined ? null : (
        <>
          <InspectorPanelTitle>Meta</InspectorPanelTitle>
          <InspectorKv
            rows={[
              ...(scheduleId === undefined ? [] : [{ label: "Id", value: scheduleId, mono: true }]),
              ...(last === undefined ? [] : [{ label: "Last fire", value: last }]),
            ]}
          />
        </>
      )}
    </InspectorShell>
  );
}
