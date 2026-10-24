import { RunList } from "../../../src/ui/observability/elements.js";
import { TRACES } from "../fixtures.js";

export default { title: "Observability / Views / Runs" };

const runs = Object.values(TRACES);

export const Runs = () => (
  <div className="p-6">
    <RunList traces={runs} />
  </div>
);

export const GroupedBySidecar = () => (
  <div className="p-6">
    <RunList traces={runs} groupBy="sidecar" />
  </div>
);
GroupedBySidecar.storyName = "Grouped by sidecar";
