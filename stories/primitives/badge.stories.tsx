import {
  WORKFLOW_SCOPE_BADGE_TONE,
  WORKFLOW_STATUS_BADGE_TONE,
  WORKFLOW_STATUS_DOT_TONE,
  WORKFLOW_STATUS_LABEL,
  workflowScopeLabel,
  workflowStatusLive,
  type WorkflowScope as WorkflowScopeValue,
  type WorkflowStatusTone,
} from "../../src/lib/workflow-registry.js";
import { Badge } from "../../src/ui/badge.js";
import { StatusDot } from "../../src/ui/status-dot.js";

export default { title: "Primitives / Badge" };

export const Tones = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge tone="neutral">Draft</Badge>
    <Badge tone="accent">Personal</Badge>
    <Badge tone="info">Everyone</Badge>
    <Badge tone="success">Delivered</Badge>
    <Badge tone="danger">Failed</Badge>
  </div>
);

const STATUS_TONES: readonly WorkflowStatusTone[] = ["running", "awaiting", "done", "paused", "fail"];

/** A workflow status chip is `Badge` plus a leading `StatusDot` — the tone
 * and pulsing rule come from `lib/workflow-registry`'s mapping tables, not
 * from a dedicated component. */
export const WorkflowStatus = () => (
  <div className="flex flex-wrap items-center gap-2">
    {STATUS_TONES.map((tone) => (
      <Badge key={tone} tone={WORKFLOW_STATUS_BADGE_TONE[tone]}>
        <StatusDot label="" tone={WORKFLOW_STATUS_DOT_TONE[tone]} live={workflowStatusLive(tone)} />
        {WORKFLOW_STATUS_LABEL[tone]}
      </Badge>
    ))}
  </div>
);

const SCOPES: readonly WorkflowScopeValue[] = ["personal", "tenant"];

/** A workflow scope pill is a plain tone lookup on `Badge` — see
 * `WORKFLOW_SCOPE_BADGE_TONE` in `lib/workflow-registry`. */
export const WorkflowScope = () => (
  <div className="flex flex-wrap items-center gap-2">
    {SCOPES.map((scope) => (
      <Badge key={scope} tone={WORKFLOW_SCOPE_BADGE_TONE[scope]}>
        {workflowScopeLabel(scope)}
      </Badge>
    ))}
  </div>
);
