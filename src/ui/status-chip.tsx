import {
  WORKFLOW_STATUS_BADGE_TONE,
  WORKFLOW_STATUS_DOT_TONE,
  type WorkflowStatusTone,
} from "../lib/workflow-registry.js";
import { Badge } from "./badge.js";
import { StatusDot } from "./status-dot.js";

export type StatusChipProps = {
  readonly tone: WorkflowStatusTone;
  readonly label: string;
  /** Defaults to pulsing for `running` and `awaiting` — the two tones that
   * are still moving or still waiting on someone. */
  readonly live?: boolean;
  readonly className?: string;
};

/**
 * A status chip for a run or schedule row: `Badge`'s contrast-tested fill
 * carries the state's colour, and a leading `StatusDot` carries liveness —
 * the same split `workflow-dock.tsx` already draws between the two.
 */
export function StatusChip({ tone, label, live, className }: StatusChipProps) {
  const pulsing = live ?? (tone === "running" || tone === "awaiting");
  return (
    <Badge tone={WORKFLOW_STATUS_BADGE_TONE[tone]} className={className}>
      <StatusDot label="" tone={WORKFLOW_STATUS_DOT_TONE[tone]} live={pulsing} />
      {label}
    </Badge>
  );
}
