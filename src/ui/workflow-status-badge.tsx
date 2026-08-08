import {
  WORKFLOW_STATUS_BADGE_TONE,
  WORKFLOW_STATUS_DOT_TONE,
  workflowStatusLive,
  type WorkflowStatusTone,
} from "../lib/workflow-registry.js";
import { Badge } from "./badge.js";
import { StatusDot } from "./status-dot.js";

export type WorkflowStatusBadgeProps = {
  readonly tone: WorkflowStatusTone;
  readonly label: string;
  readonly className?: string;
};

/** A run or schedule's status chip: a `Badge` carrying a `StatusDot` sized to
 * the same `WorkflowStatusTone`, with the dot's `live` pulse derived from that
 * tone. Callers own the label and which tone a given phase maps to — this
 * only removes the Badge/StatusDot/tone-lookup wiring that was copy-pasted
 * across `LiveRunHeader`, `ScheduleHeader` and `WorkflowRegistryRow`. */
export function WorkflowStatusBadge({ tone, label, className }: WorkflowStatusBadgeProps) {
  return (
    <Badge tone={WORKFLOW_STATUS_BADGE_TONE[tone]} className={className}>
      <StatusDot label="" tone={WORKFLOW_STATUS_DOT_TONE[tone]} live={workflowStatusLive(tone)} />
      {label}
    </Badge>
  );
}
