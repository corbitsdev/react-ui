import { StepList } from "../../src/ui/step-list.js";
import type { StepListItem } from "../../src/lib/workflow-registry.js";

export default { title: "Workflow / Step list" };

const STEPS: StepListItem[] = [
  { id: "1", name: "Collect open invoices", status: "done" },
  { id: "2", name: "Draft the reminder email", status: "done", meta: "3 recipients" },
  { id: "3", name: "Send for approval", status: "active" },
  { id: "4", name: "Send to customers", status: "pending" },
];

export const InProgress = () => <StepList steps={STEPS} label="Invoice reminder steps" />;

export const WithAFailure = () => (
  <StepList
    steps={[
      { id: "1", name: "Fetch the latest metrics export", status: "done" },
      { id: "2", name: "Build the weekly summary", status: "failed", meta: "Timed out after 30s" },
      { id: "3", name: "Post to the leadership channel", status: "pending" },
    ]}
    label="Weekly metrics steps"
  />
);

export const Empty = () => <StepList steps={[]} label="Steps" />;
