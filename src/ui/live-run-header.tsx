import type { ReactNode } from "react";

import {
  LIVE_RUN_PHASE_LABEL,
  LIVE_RUN_PHASE_TONE,
  type LiveRunPhase,
  type WorkflowScope,
} from "../lib/workflow-registry.js";
import { InspectorHeader } from "./inspector-shell.js";
import { ScopePill } from "./scope-pill.js";
import { StatusChip } from "./status-chip.js";

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
          <StatusChip tone={LIVE_RUN_PHASE_TONE[phase]} label={LIVE_RUN_PHASE_LABEL[phase]} />
          {scope === undefined ? null : <ScopePill scope={scope} />}
        </>
      }
      title={title}
      description={description}
      actions={actions}
    />
  );
}
