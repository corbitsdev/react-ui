import { InspectorEmpty } from "../../src/ui/inspector-shell.js";
import { LiveRunInspector } from "../../src/ui/live-run-inspector.js";
import type { StepListItem } from "../../src/lib/workflow-registry.js";

export default { title: "Workflow / Live run inspector" };

const STEPS: StepListItem[] = [
  { id: "1", name: "Collect open invoices", status: "done" },
  { id: "2", name: "Draft the reminder email", status: "done", meta: "3 recipients" },
  { id: "3", name: "Send for approval", status: "active" },
  { id: "4", name: "Send to customers", status: "pending" },
];

export const Running = () => (
  <div className="h-[520px] w-96">
    <LiveRunInspector
      phase="running"
      scope="personal"
      title="Invoice reminders"
      description="Chases every invoice more than 30 days overdue."
      elapsed="00:42"
      started="8:02 PM"
      runId="run_9f2a1c"
      steps={STEPS}
    />
  </div>
);

export const AwaitingYou = () => (
  <div className="h-[520px] w-96">
    <LiveRunInspector
      phase="awaiting"
      scope="tenant"
      title="Vendor renewal review"
      elapsed="04:11"
      steps={STEPS}
      gate={
        <div className="rounded-lg border border-primary-emphasis/30 bg-primary/5 px-3.5 py-3">
          <p className="text-sm font-semibold">Approve the renewal terms?</p>
        </div>
      }
    />
  </div>
);

export const Failed = () => (
  <div className="h-[520px] w-96">
    <LiveRunInspector
      phase="failed"
      title="Weekly metrics summary"
      steps={[
        { id: "1", name: "Fetch the latest metrics export", status: "done" },
        { id: "2", name: "Build the weekly summary", status: "failed", meta: "Timed out after 30s" },
      ]}
    />
  </div>
);

export const Empty = () => (
  <div className="h-[520px] w-96">
    <LiveRunInspector
      phase="running"
      title="Live run"
      empty={<InspectorEmpty title="No run selected" description="Pick a live run from the list to see its details here." />}
    />
  </div>
);
