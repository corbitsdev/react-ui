import type { ReactNode } from "react";

import type { WorkflowScope } from "../lib/workflow-registry.js";
import { InspectorHeader } from "./inspector-shell.js";
import { ScopePill } from "./scope-pill.js";
import { StatusChip } from "./status-chip.js";

export type ScheduleHeaderProps = {
  readonly enabled: boolean;
  readonly scope: WorkflowScope;
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly className?: string;
};

/** A schedule's header block — active/paused chip, scope pill, title and
 * caller-supplied actions — the schedule counterpart of `LiveRunHeader`,
 * reusable outside the inspector shell. */
export function ScheduleHeader({ enabled, scope, title, description, actions, className }: ScheduleHeaderProps) {
  return (
    <InspectorHeader
      className={className}
      eyebrow={
        <>
          <StatusChip tone={enabled ? "running" : "paused"} label={enabled ? "Active" : "Paused"} live={enabled} />
          <ScopePill scope={scope} />
        </>
      }
      title={title}
      description={description}
      actions={actions}
    />
  );
}
