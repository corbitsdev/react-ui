import { ObservabilityApp } from "../../src/blocks/observability/app.js";
import { AreaChart } from "../../src/ui/observability/area-chart.js";
import { SessionTable } from "../../src/ui/observability/session-table.js";
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

export const Workflow = () => (
  <div className="h-[820px] border border-border">
    <WorkflowTrace trace={trace("wf-review")} peers={Object.values(TRACES)} />
  </div>
);

export const Finance = () => (
  <div className="h-[820px] border border-border">
    <WorkflowTrace
      trace={trace("wf-review")}
      peers={Object.values(TRACES)}
      defaultAudience="cfo"
    />
  </div>
);

export const Operations = () => (
  <div className="h-[820px] border border-border">
    <WorkflowTrace
      trace={trace("wf-review")}
      peers={Object.values(TRACES)}
      defaultAudience="coo"
    />
  </div>
);

export const Security = () => (
  <div className="h-[820px] border border-border">
    <WorkflowTrace
      trace={trace("wf-review")}
      peers={Object.values(TRACES)}
      defaultAudience="ciso"
    />
  </div>
);
