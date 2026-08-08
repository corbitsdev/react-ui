import type { ReactNode } from "react";

import { WORKFLOW_SCOPE_BADGE_TONE, workflowScopeLabel, type WorkflowScope } from "../lib/workflow-registry.js";
import { Badge } from "./badge.js";
import { InspectorHeader } from "./inspector-shell.js";
import { WorkflowStatusBadge } from "./workflow-status-badge.js";

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
          <WorkflowStatusBadge tone={enabled ? "running" : "paused"} label={enabled ? "Active" : "Paused"} />
          <Badge tone={WORKFLOW_SCOPE_BADGE_TONE[scope]}>{workflowScopeLabel(scope)}</Badge>
        </>
      }
      title={title}
      description={description}
      actions={actions}
    />
  );
}
