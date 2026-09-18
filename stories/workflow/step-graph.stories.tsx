import { StepGraph, type StepGraphStep } from "../../src/ui/step-graph.js";

export default { title: "Workflow / Step graph" };

const STEPS: StepGraphStep[] = [
  { id: "1", title: "Watch inbox", kind: "auto", status: "completed" },
  { id: "2", title: "Summarize the thread", kind: "agent", status: "completed" },
  { id: "3", title: "Approve the reply", kind: "human", status: "running" },
  { id: "4", title: "Send the reply", kind: "auto", status: "pending" },
];

export const Compact = () => <StepGraph steps={STEPS} density="compact" />;

export const Expanded = () => <StepGraph steps={STEPS} density="expanded" />;

// A fan-out/fan-in: "Summarize" and "Draft options" both depend on "Watch
// inbox" and both feed "Approve the reply". The layout still places nodes in
// one straight line, in array order — `edges` only changes which connectors
// draw, not where a node sits — so this is the shape of a small DAG the graph
// can represent today, not a branched, multi-column layout.
const BRANCHING_STEPS: StepGraphStep[] = [
  { id: "1", title: "Watch inbox", kind: "auto", status: "completed" },
  { id: "2", title: "Summarize the thread", kind: "agent", status: "completed" },
  { id: "3", title: "Draft options", kind: "agent", status: "running" },
  { id: "4", title: "Approve the reply", kind: "human", status: "pending" },
];

export const Branching = () => (
  <StepGraph
    steps={BRANCHING_STEPS}
    edges={[
      { from: "1", to: "2" },
      { from: "1", to: "3" },
      { from: "2", to: "4" },
      { from: "3", to: "4" },
    ]}
    density="expanded"
  />
);

export const Empty = () => <StepGraph steps={[]} />;
