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

export const Empty = () => <StepGraph steps={[]} />;
