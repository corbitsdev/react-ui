import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { InfoIcon } from "lucide-react";

import { cn } from "../lib/utils.js";

export type InfoTooltipProps = {
  /** The note shown in the tooltip and bound to the trigger via `aria-describedby`. */
  readonly label: string;
  /** Accessible name for the trigger button. Defaults to `label`. */
  readonly triggerLabel?: string;
  readonly className?: string;
};

/**
 * A focusable info glyph that discloses a short note on hover or focus.
 *
 * Radix owns the `aria-describedby` wiring, the open-on-focus/hover
 * behaviour, and Escape-to-dismiss; this layer only paints. Built for notes
 * that today get bolted onto a non-interactive element via a `title`
 * attribute — that reaches a mouse only, is never announced by a screen
 * reader, and never fires on touch. A `<button>` trigger fixes all three:
 * it is in the tab order, Radix associates the note by id, and tapping it
 * opens the tooltip on touch devices.
 */
export function InfoTooltip({ label, triggerLabel, className }: InfoTooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label={triggerLabel ?? label}
            className={cn(
              "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors",
              "hover:text-foreground focus-visible:text-foreground focus-visible:outline-none",
              "focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_22%,transparent)]",
              className,
            )}
          >
            <InfoIcon className="size-full" />
          </button>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            data-slot="tooltip-content"
            sideOffset={6}
            className={cn(
              "z-50 max-w-64 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-lg",
              "data-[state=delayed-open]:animate-[corbits-fade-in_150ms_ease-out] data-[state=closed]:animate-[corbits-fade-out_120ms_ease-in]",
            )}
          >
            {label}
            <TooltipPrimitive.Arrow className="fill-popover" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
