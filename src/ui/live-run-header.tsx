import type { ReactNode } from "react";

import {
  LIVE_RUN_PHASE_LABEL,
  LIVE_RUN_PHASE_TONE,
  WORKFLOW_SCOPE_BADGE_TONE,
  WORKFLOW_STATUS_BADGE_TONE,
  WORKFLOW_STATUS_DOT_TONE,
  workflowScopeLabel,
  workflowStatusLive,
  type LiveRunPhase,
  type WorkflowScope,
} from "../lib/workflow-registry.js";
import { Badge } from "./badge.js";
import { InspectorHeader } from "./inspector-shell.js";
import { StatusDot } from "./status-dot.js";

export type LiveRunHeaderProps = {
  readonly phase: LiveRunPhase;
  readonly scope?: WorkflowScope;
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly className?: string;
};

/** A live run's header block — phase chip, optional scope pill, title and
 * caller-supplied actions — standalone so a run surface that is not an
 * inspector (a full-page run view, a dialog) can reuse exactly this row. */
export function LiveRunHeader({ phase, scope, title, description, actions, className }: LiveRunHeaderProps) {
  return (
    <InspectorHeader
      className={className}
      eyebrow={
        <>
          <Badge tone={WORKFLOW_STATUS_BADGE_TONE[LIVE_RUN_PHASE_TONE[phase]]}>
            <StatusDot
              label=""
              tone={WORKFLOW_STATUS_DOT_TONE[LIVE_RUN_PHASE_TONE[phase]]}
              live={workflowStatusLive(LIVE_RUN_PHASE_TONE[phase])}
            />
            {LIVE_RUN_PHASE_LABEL[phase]}
          </Badge>
          {scope === undefined ? null : (
            <Badge tone={WORKFLOW_SCOPE_BADGE_TONE[scope]}>{workflowScopeLabel(scope)}</Badge>
          )}
        </>
      }
      title={title}
      description={description}
      actions={actions}
    />
  );
}
