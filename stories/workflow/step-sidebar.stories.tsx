import { useState } from "react";

import { StepSidebar } from "../../src/ui/step-sidebar.js";
import type { WorkflowStep } from "../../src/lib/workflow-run-progress.js";

export default { title: "Workflow / Step sidebar" };

const STEPS: WorkflowStep[] = [
  { number: 1, label: "Collect open invoices", status: "completed" },
  { number: 2, label: "Draft the reminder email", status: "completed" },
  { number: 3, label: "Send for approval", status: "current" },
  { number: 4, label: "Send to customers", status: "pending" },
];

/** Owns `collapsed` state the way any real consumer would — `StepSidebar`
 * itself holds no state. */
function ToggleableStepSidebar(props: Omit<React.ComponentProps<typeof StepSidebar>, "collapsed" | "onToggle">) {
  const [collapsed, setCollapsed] = useState(false);
  return <StepSidebar {...props} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />;
}

export const Expanded = () => (
  <div className="h-96">
    <ToggleableStepSidebar steps={STEPS} />
  </div>
);

export const Collapsed = () => {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <div className="h-96">
      <StepSidebar steps={STEPS} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
    </div>
  );
};

export const WithFooter = () => (
  <div className="h-96">
    <ToggleableStepSidebar
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
    <ToggleableStepSidebar
      steps={[
        { number: 1, label: "Collect open invoices", status: "completed" },
        { number: 2, label: "Draft the reminder email", status: "failed" },
        { number: 3, label: "Send for approval", status: "pending" },
      ]}
    />
  </div>
);

export const Empty = () => (
  <div className="h-96">
    <ToggleableStepSidebar steps={[]} />
  </div>
);

export const LongLabel = () => (
  <div className="h-96">
    <ToggleableStepSidebar
      steps={[
        {
          number: 1,
          label: "Reconcile every outstanding invoice across all connected payment processors before sending the weekly summary",
          status: "current",
        },
        { number: 2, label: "Send to customers", status: "pending" },
      ]}
    />
  </div>
);

const MANY_STEPS: WorkflowStep[] = Array.from({ length: 15 }, (_, i) => ({
  number: i + 1,
  label: `Step ${i + 1}: ${["Collect", "Draft", "Review", "Approve", "Send"][i % 5]} batch ${Math.ceil((i + 1) / 5)}`,
  status: i === 0 ? "completed" : i === 3 ? "current" : i < 3 ? "completed" : "pending",
}));

export const ManyStepsOverflow = () => (
  <div className="h-72">
    <ToggleableStepSidebar steps={MANY_STEPS} />
  </div>
);
