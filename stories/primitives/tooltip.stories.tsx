import { Button } from "../../src/ui/button.js";
import { InfoTooltip, Tooltip } from "../../src/ui/tooltip.js";

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
  <div className="flex items-center gap-2 pt-20 pl-24 text-sm">
    <span>Token budget</span>
    <InfoTooltip
      label="Caps spend per run; excess requests queue until the next window."
      defaultOpen
    />
  </div>
);

export const General = () => (
  <div className="flex flex-wrap items-center gap-4 p-8 text-sm">
    <Tooltip label="Save changes to current workspace">
      <Button size="sm">Save</Button>
    </Tooltip>

    <Tooltip label="Inspect active workspace endpoints">
      <Button variant="outline" size="sm">
        API Live
      </Button>
    </Tooltip>

    <Tooltip label="View keyboard shortcuts">
      <Button variant="ghost" size="sm">
        Shortcuts
      </Button>
    </Tooltip>
  </div>
);

export const PlacementSides = () => (
  <div className="grid max-w-lg grid-cols-2 gap-x-24 gap-y-16 px-36 py-16 text-sm">
    <Tooltip side="top" label="Disclosed on top" defaultOpen>
      <Button variant="outline" size="sm">
        Top
      </Button>
    </Tooltip>
    <Tooltip side="bottom" label="Disclosed on bottom" defaultOpen>
      <Button variant="outline" size="sm">
        Bottom
      </Button>
    </Tooltip>
    <Tooltip side="left" label="Disclosed on left" defaultOpen>
      <Button variant="outline" size="sm">
        Left
      </Button>
    </Tooltip>
    <Tooltip side="right" label="Disclosed on right" defaultOpen>
      <Button variant="outline" size="sm">
        Right
      </Button>
    </Tooltip>
  </div>
);

export const RichLabel = () => (
  <div className="pt-20 pl-24 text-sm">
    <Tooltip
      defaultOpen
      label={
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-foreground">API Quota</span>
          <span className="text-muted-foreground">
            8,420 of 10,000 monthly credits used.
          </span>
        </div>
      }
    >
      <Button variant="outline" size="sm">
        Usage meter
      </Button>
    </Tooltip>
  </div>
);
