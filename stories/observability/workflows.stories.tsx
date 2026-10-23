import {
  WorkflowFinOps,
  WorkflowsFinOps,
} from "../../src/ui/observability/finops.js";
import { WorkflowTrace } from "../../src/ui/observability/trace-view.js";
import { trace, tracesOf } from "./fixtures.js";

export default { title: "Observability / Workflows" };

export const WorkflowsFinOpsOverview = () => (
  <div className="border border-border">
    <WorkflowsFinOps traces={tracesOf("workflow")} />
  </div>
);
WorkflowsFinOpsOverview.storyName = "Workflows FinOps Overview";

export const WorkflowFinOpsOverview = () => (
  <div className="border border-border">
    <WorkflowFinOps trace={trace("wf-review")} />
  </div>
);
WorkflowFinOpsOverview.storyName = "Workflow FinOps Overview";

export const Workflow = () => (
  <div className="h-[820px] border border-border">
    <WorkflowTrace trace={trace("wf-review")} />
  </div>
);
Workflow.storyName = "Workflow";
