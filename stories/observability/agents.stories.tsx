import {
  WorkflowFinOps,
  WorkflowsFinOps,
} from "../../src/ui/observability/finops.js";
import { AgentTrace } from "../../src/ui/observability/trace-view.js";
import { trace, tracesOf } from "./fixtures.js";

export default { title: "Observability / Agents" };

export const AgentsFinOpsOverview = () => (
  <div className="border border-border">
    <WorkflowsFinOps traces={tracesOf("agent")} />
  </div>
);
AgentsFinOpsOverview.storyName = "Agents FinOps Overview";

export const AgentFinOpsOverview = () => (
  <div className="border border-border">
    <WorkflowFinOps trace={trace("ag-editor")} />
  </div>
);
AgentFinOpsOverview.storyName = "Agent FinOps Overview";

export const Agent = () => (
  <div className="h-[820px] border border-border">
    <AgentTrace trace={trace("ag-editor")} />
  </div>
);
