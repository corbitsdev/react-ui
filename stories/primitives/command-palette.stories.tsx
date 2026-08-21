import { useState } from "react";

import { CommandPalette, CommandPaletteInline, type CommandPaletteGroup } from "../../src/ui/command-palette.js";
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

/** The same machine in the chrome: a magnifier that morphs into the field it
 * searches from, with results anchored beneath instead of over an overlay. */
export const Inline = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <div className="flex h-64 justify-end border border-border p-3">
      <CommandPaletteInline
        open={open}
        onOpenChange={setOpen}
        query={query}
        onQueryChange={setQuery}
        groups={GROUPS}
        onSelect={() => {}}
        className="flex items-center"
        leading={
          <button
            type="button"
            aria-label="Search"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="grid size-8 shrink-0 cursor-pointer place-items-center text-muted-foreground"
          >
            ⌕
          </button>
        }
        footer="# workbenches · @ people · > actions · / pages"
      />
    </div>
  );
};
