import { StatusDot } from "../../src/ui/status-dot.js";

export default { title: "Primitives / Status dot" };

export const Tones = () => (
  <div className="flex items-center gap-4 text-sm">
    <span className="flex items-center gap-2">
      <StatusDot label="Idle" /> Idle
    </span>
    <span className="flex items-center gap-2">
      <StatusDot label="Running" tone="emphasis" live /> Running
    </span>
    <span className="flex items-center gap-2">
      <StatusDot label="Failing" tone="danger" live /> Failing
    </span>
  </div>
);

export const ExtraSmall = () => (
  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
    <StatusDot label="Agent active" tone="emphasis" size="xs" live /> Agent active
  </span>
);
