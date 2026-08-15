import { PulsingRing } from "../../src/ui/pulsing-ring.js";

export default { title: "Primitives / Pulsing ring" };

export const OnAStep = () => (
  <div className="relative inline-flex size-3 items-center justify-center rounded-full bg-primary-emphasis">
    <PulsingRing colorClassName="bg-primary-emphasis" />
  </div>
);

export const Danger = () => (
  <div className="relative inline-flex size-3 items-center justify-center rounded-full bg-destructive">
    <PulsingRing colorClassName="bg-destructive" />
  </div>
);

export const InARow = () => (
  <div className="flex items-center gap-6 p-4">
    {["Queued", "Running", "Retrying"].map((label, index) => (
      <div key={label} className="flex items-center gap-2">
        <span className="relative inline-flex size-2.5 rounded-full bg-primary-emphasis">
          {index === 1 ? <PulsingRing colorClassName="bg-primary-emphasis" /> : null}
        </span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    ))}
  </div>
);
