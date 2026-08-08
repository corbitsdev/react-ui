import { HorizontalStepper } from "../../src/ui/horizontal-stepper.js";
import type { WorkflowStep } from "../../src/lib/workflow-run-progress.js";

export default { title: "Workflow / Horizontal stepper" };

const SHORT_RUN: WorkflowStep[] = [
  { number: 1, label: "Intake", status: "completed" },
  { number: 2, label: "Draft", status: "completed" },
  { number: 3, label: "Review", status: "current" },
  { number: 4, label: "Send", status: "pending" },
];

export const FewSteps = () => <HorizontalStepper steps={SHORT_RUN} />;

export const WithAFailure = () => (
  <HorizontalStepper
    steps={[
      { number: 1, label: "Intake", status: "completed" },
      { number: 2, label: "Enrich contacts", status: "failed" },
      { number: 3, label: "Send", status: "pending" },
    ]}
  />
);

// Above five steps the rail compresses every label but the current one to a
// numbered pill — this is the density HorizontalStepper is built for.
export const ManySteps = () => (
  <HorizontalStepper
    steps={[
      { number: 1, label: "Intake", status: "completed" },
      { number: 2, label: "Research the account", status: "completed" },
      { number: 3, label: "Draft the proposal", status: "completed" },
      { number: 4, label: "Internal review", status: "current" },
      { number: 5, label: "Customer review", status: "pending" },
      { number: 6, label: "Countersign", status: "pending" },
      { number: 7, label: "Archive", status: "pending" },
    ]}
  />
);
