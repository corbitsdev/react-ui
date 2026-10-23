import { ObservabilityApp } from "../../src/blocks/observability/app.js";
import { AreaChart } from "../../src/ui/observability/area-chart.js";
import { SessionTable } from "../../src/ui/observability/session-table.js";
import { WorkflowFinOps, WorkflowsFinOps } from "../../src/ui/observability/slots.js";
import { AgentTrace, WorkflowTrace } from "../../src/ui/observability/trace-view.js";
import { FAILURES, SERIES, SESSIONS, TRACES } from "./fixtures.js";

export default { title: "Observability / Spike" };

export const App = () => (
  <ObservabilityApp sessions={SESSIONS} traces={TRACES} series={SERIES} failures={FAILURES} />
);

export const Area = () => (
  <div className="max-w-3xl p-6">
    <AreaChart
      title="Sessions"
      description="Completed runs, and the runs that failed, by day."
      data={SERIES}
      compare={FAILURES}
      valueLabel="Sessions"
      compareLabel="Failed"
    />
  </div>
);

export const Sessions = () => (
  <div className="p-6">
    <SessionTable sessions={SESSIONS} selectedId="wf-review" onSelect={() => {}} />
  </div>
);

function trace(id: string) {
  const value = TRACES[id];
  if (value === undefined) throw new Error(`Missing fixture ${id}`);
  return value;
}

export const Agent = () => (
  <div className="h-[820px] border border-border">
    <AgentTrace trace={trace("ag-editor")} />
  </div>
);

export const WorkflowsFinOpsOverview = () => (
  <div className="border border-border">
    <WorkflowsFinOps traces={Object.values(TRACES)} />
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
