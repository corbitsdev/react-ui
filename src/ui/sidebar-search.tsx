"use client";

import { Search } from "lucide-react";
import type * as React from "react";

import { cn } from "../lib/utils.js";
import { useCommandShortcut } from "./command-palette.js";

export type SidebarSearchProps = Omit<
  React.ComponentProps<"button">,
  "onClick" | "children"
> & {
  /**
   * Opens the host's `CommandPalette`. Click and the palette's existing
   * Cmd+K / Ctrl+K listener both call this. The host owns whether the
   * palette is open; this control does not.
   */
  onOpen: () => void;
};

/**
 * Search row for the rail. Same item styling as `SidebarItem`, so the label
 * and the Cmd+K hint collapse to the icon with the rest of the rail.
 *
 * Lives beside `sidebar.tsx` rather than in it: binding the shortcut imports
 * the command palette, and that module pulls in the optional dialog peer.
 * The root barrel must not reach that peer.
 */
export function SidebarSearch({
  onOpen,
  className,
  disabled,
  ...props
}: SidebarSearchProps) {
  const shortcutEnabled = disabled !== true;
  useCommandShortcut(onOpen, shortcutEnabled);
  return (
    <div className="px-2">
      <button
        {...props}
        type="button"
        disabled={disabled}
        data-slot="sidebar-search"
        aria-haspopup="dialog"
        aria-keyshortcuts={shortcutEnabled ? "Meta+K Control+K" : undefined}
        onClick={onOpen}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
          "text-muted-foreground hover:bg-muted hover:text-foreground",
          "group-data-[collapsed=true]/sidebar:justify-center",
          className,
        )}
      >
        <span
          className="grid size-4 shrink-0 place-items-center [&_svg]:size-4"
          aria-hidden
        >
          <Search />
        </span>
        <span className="min-w-0 flex-1 truncate text-left group-data-[collapsed=true]/sidebar:sr-only">
          Search
        </span>
        {shortcutEnabled ? (
          <kbd className="shrink-0 font-mono text-[11px] text-muted-foreground group-data-[collapsed=true]/sidebar:sr-only">
            Cmd+K
          </kbd>
        ) : null}
      </button>
    </div>
  );
}
