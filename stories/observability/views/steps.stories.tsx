import { Observations } from "../../../src/ui/observability/observations.js";
import { TRACES } from "../fixtures.js";

export default { title: "Observability / Views / Steps" };

export const Steps = () => (
  <div className="border border-border">
    <Observations traces={Object.values(TRACES)} onOpen={() => {}} />
  </div>
);
