import { StatusChip } from "../../src/ui/status-chip.js";

export default { title: "Workflow / Status chip" };

export const AllTones = () => (
  <div className="flex flex-wrap items-center gap-2">
    <StatusChip tone="running" label="Running" />
    <StatusChip tone="awaiting" label="Needs you" />
    <StatusChip tone="done" label="Done" />
    <StatusChip tone="paused" label="Paused" />
    <StatusChip tone="fail" label="Failed" />
  </div>
);
