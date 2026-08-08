import {
  WORKFLOW_SCOPE_BADGE_TONE,
  WORKFLOW_STATUS_BADGE_TONE,
  WORKFLOW_STATUS_DOT_TONE,
  workflowScopeLabel,
  workflowStatusLive,
} from "../../src/lib/workflow-registry.js";
import { Badge } from "../../src/ui/badge.js";
import {
  InspectorEmpty,
  InspectorHeader,
  InspectorKv,
  InspectorShell,
} from "../../src/ui/inspector-shell.js";
import { StatusDot } from "../../src/ui/status-dot.js";

export default { title: "Workflow / Inspector shell" };

export const WithContent = () => (
  <div className="h-96 w-80">
    <InspectorShell
      header={
        <InspectorHeader
          eyebrow={
            <>
              <Badge tone={WORKFLOW_STATUS_BADGE_TONE.running}>
                <StatusDot label="" tone={WORKFLOW_STATUS_DOT_TONE.running} live={workflowStatusLive("running")} />
                Running
              </Badge>
              <Badge tone={WORKFLOW_SCOPE_BADGE_TONE.personal}>{workflowScopeLabel("personal")}</Badge>
            </>
          }
          title="Nightly digest to Sales"
        />
      }
    >
      <InspectorKv
        rows={[
          { label: "Started", value: "8:02 PM" },
          { label: "Elapsed", value: "00:42" },
          { label: "Run id", value: "run_9f2a1c", mono: true },
        ]}
      />
    </InspectorShell>
  </div>
);

export const Empty = () => (
  <div className="h-96 w-80">
    <InspectorShell empty={<InspectorEmpty title="No run selected" description="Pick a run from the list to see its details here." />} />
  </div>
);
