import { InfoTooltip } from "../../src/ui/tooltip.js";

export default { title: "Primitives / Tooltip" };

export const Basic = () => (
  <div className="flex items-center gap-2 text-sm">
    <span>Token budget</span>
    <InfoTooltip label="Caps spend per run; excess requests queue until the next window." />
  </div>
);
