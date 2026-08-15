import { StepSidebar } from "../../src/ui/step-sidebar.js";
import type { WorkflowStep } from "../../src/lib/workflow-run-progress.js";

export default { title: "Workflow / Step sidebar" };

const STEPS: WorkflowStep[] = [
  { number: 1, label: "Collect open invoices", status: "completed" },
  { number: 2, label: "Draft the reminder email", status: "completed" },
  { number: 3, label: "Send for approval", status: "current" },
  { number: 4, label: "Send to customers", status: "pending" },
];

export const Expanded = () => (
  <div className="h-96">
    <StepSidebar steps={STEPS} />
  </div>
);

export const Collapsed = () => (
  <div className="h-96">
    <StepSidebar steps={STEPS} defaultCollapsed />
  </div>
);

export const WithFooter = () => (
  <div className="h-96">
    <StepSidebar
      steps={STEPS}
      footer={
        <div className="flex flex-col gap-1 p-3">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-muted-foreground">Stage source</div>
          <div className="text-sm font-medium text-foreground">3 pain points selected</div>
        </div>
      }
    />
  </div>
);

export const WithAFailure = () => (
  <div className="h-96">
    <StepSidebar
      steps={[
        { number: 1, label: "Collect open invoices", status: "completed" },
        { number: 2, label: "Draft the reminder email", status: "failed" },
        { number: 3, label: "Send for approval", status: "pending" },
      ]}
    />
  </div>
);
