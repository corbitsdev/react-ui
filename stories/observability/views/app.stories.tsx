import { ObservabilityApp } from "../../../src/blocks/observability/app.js";
import { FAILURES, SERIES, SESSIONS, TRACES } from "../fixtures.js";

export default { title: "Observability / Views / App" };

export const App = () => (
  <ObservabilityApp
    sessions={SESSIONS}
    traces={TRACES}
    series={SERIES}
    failures={FAILURES}
  />
);
