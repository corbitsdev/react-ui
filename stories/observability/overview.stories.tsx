import { Observations } from "../../src/ui/observability/observations.js";
import { WeekOverview } from "../../src/ui/observability/overview.js";
import { SessionTable } from "../../src/ui/observability/session-table.js";
import { FAILURES, SERIES, SESSIONS, TRACES } from "./fixtures.js";

export default { title: "Observability / Overview" };

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

export const Sessions = () => (
  <div className="p-6">
    <SessionTable
      sessions={SESSIONS}
      selectedId="wf-review"
      onSelect={() => {}}
    />
  </div>
);

export const ObservationsPage = () => (
  <div className="border border-border">
    <Observations traces={Object.values(TRACES)} onOpen={() => {}} />
  </div>
);
ObservationsPage.storyName = "Observations";
