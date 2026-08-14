import { useState } from "react";

import { CommandPalette, type CommandPaletteGroup } from "../../src/ui/command-palette.js";
import { Badge } from "../../src/ui/badge.js";

export default { title: "Primitives / Command palette" };

const GROUPS: CommandPaletteGroup[] = [
  {
    id: "pages",
    heading: "Pages",
    items: [
      { id: "page-1", title: "Settings" },
      { id: "page-2", title: "Billing" },
    ],
  },
  {
    id: "entities",
    heading: "Results",
    items: [{ id: "entity-1", title: "Q3 Launch Plan", subtitle: "Artifact" }],
  },
];

/** A scope chip leading the input, and a keyboard-hint legend pinned under the results. */
export const WithAccessoryAndFooter = () => {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");

  return (
    <CommandPalette
      open={open}
      onOpenChange={setOpen}
      query={query}
      onQueryChange={setQuery}
      groups={GROUPS}
      onSelect={() => {}}
      inputAccessory={<Badge tone="accent">This bench</Badge>}
      footer={
        <div className="flex items-center gap-3">
          <span>↑↓ to navigate</span>
          <span>↵ to select</span>
          <span>esc to close</span>
        </div>
      }
    />
  );
};
