import { TimeSeriesChart } from "../../src/ui/time-series-chart.js";

export default { title: "Primitives / Time series chart" };

const LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TURNS = [120, 180, 160, 240, 220, 90, 60];
const TOOL_CALLS = [340, 520, 470, 690, 640, 210, 150];

export const Line = () => (
  <TimeSeriesChart
    title="Turns per day"
    labels={LABELS}
    series={[{ label: "Turns", values: TURNS }]}
  />
);

export const Area = () => (
  <TimeSeriesChart
    title="Activity per day"
    description="Turns and tool calls, stacked reading via the tooltip."
    variant="area"
    labels={LABELS}
    series={[
      { label: "Turns", values: TURNS },
      { label: "Tool calls", values: TOOL_CALLS },
    ]}
  />
);
