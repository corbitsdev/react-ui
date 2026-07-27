import { useEffect } from "react";

import { cn } from "../lib/utils.js";
import { Command, type CommandAction } from "./command.js";
import { Dialog, DialogContent, DialogTitle } from "./dialog.js";

export type CommandPaletteProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly actions: readonly CommandAction[];
  readonly placeholder?: string;
  readonly className?: string;
};

/**
 * The palette: a dialog whose only content is a `Command`.
 *
 * Open state is a prop. A palette that owned it would still need to be opened
 * from a menu item, a button and a shortcut, so the host ends up holding the
 * state anyway — and two sources of truth for "is the palette open" is a bug
 * with a keyboard shortcut attached.
 *
 * The title is present but visually hidden: a dialog needs an accessible name,
 * and a visible "Commands" heading above a search box that already says what it
 * is would be furniture.
 */
export function CommandPalette({ open, onOpenChange, actions, placeholder, className }: CommandPaletteProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The dialog's close button is hidden here — it would sit on top of the
          search input, and Escape is how anyone closes a palette anyway. */}
      <DialogContent className={cn("max-w-xl gap-0 p-0 [&_[aria-label=Close]]:hidden", className)}>
        <DialogTitle className="sr-only">Commands</DialogTitle>
        <Command
          actions={actions}
          label="Commands"
          placeholder={placeholder}
          onRun={() => onOpenChange(false)}
          className="max-h-96"
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Binds ⌘K / Ctrl-K to a toggle.
 *
 * A hook and not built into the palette, because plenty of apps already own
 * their global key handling and a second listener fighting theirs is worse than
 * no listener at all. It ignores repeats from a held key and lets the browser
 * keep its own ⌘K where the user is typing into a text field — stealing it
 * there is how a palette becomes the thing that eats your search box.
 */
export function useCommandShortcut(onToggle: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable === true || /^(input|textarea|select)$/i.test(target?.tagName ?? "")) return;
      event.preventDefault();
      onToggle();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onToggle, enabled]);
}
