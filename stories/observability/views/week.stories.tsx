import { AreaChart } from "../../../src/ui/observability/area-chart.js";
import { CostBars } from "../../../src/ui/observability/cost-bars.js";
import { UsageMix } from "../../../src/ui/observability/usage-mix.js";
import { WeekOverview } from "../../../src/ui/observability/overview.js";
import { usageOf } from "../../../src/ui/observability/metrics.js";
import { FAILURES, SERIES, SESSIONS, TRACES, trace } from "../fixtures.js";

export default { title: "Observability / Views / Week" };

export const Week = () => (
  <div className="border border-border">
    <WeekOverview
      series={SERIES}
      failures={FAILURES}
      sessions={SESSIONS}
      traces={Object.values(TRACES)}
      onOpen={() => {}}
    />
  </div>
);

export const Chart = () => (
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

export const Usage = () => (
  <div className="max-w-md p-6">
    <UsageMix usage={usageOf(trace("wf-review"))} />
  </div>
);

export const Cost = () => (
  <div className="max-w-xl p-6">
    <CostBars
      title="Cost by model"
      description="What each provider billed."
      rows={[
        {
          key: "frontier",
          label: "frontier / frontier",
          value: 0.12,
          detail: "13.4k",
        },
      ]}
    />
  </div>
);
