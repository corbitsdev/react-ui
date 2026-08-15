import { InfoTooltip } from "../../src/ui/tooltip.js";

export default { title: "Primitives / Tooltip" };

export const Basic = () => (
  <div className="flex items-center gap-2 text-sm">
    <span>Token budget</span>
    <InfoTooltip label="Caps spend per run; excess requests queue until the next window." />
  </div>
);

// `defaultOpen` renders the popover pre-opened so the panel, arrow and
// contrast against `--popover` are visible without hovering — check this in
// both themes.
export const Open = () => (
  <div className="flex items-center gap-2 pt-8 pl-8 text-sm">
    <span>Token budget</span>
    <InfoTooltip
      label="Caps spend per run; excess requests queue until the next window."
      defaultOpen
    />
  </div>
);
