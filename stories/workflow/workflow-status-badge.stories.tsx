import { WorkflowStatusBadge } from "../../src/ui/workflow-status-badge.js";
import { WORKFLOW_STATUS_LABEL, type WorkflowStatusTone } from "../../src/lib/workflow-registry.js";

export default { title: "Workflow / Status badge" };

const TONES: readonly WorkflowStatusTone[] = ["running", "awaiting", "done", "paused", "fail"];

export const AllTones = () => (
  <div className="flex flex-wrap gap-2">
    {TONES.map((tone) => (
      <WorkflowStatusBadge key={tone} tone={tone} label={WORKFLOW_STATUS_LABEL[tone]} />
    ))}
  </div>
);
