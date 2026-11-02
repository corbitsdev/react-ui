"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { InfoIcon } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/utils.js";

export type TooltipSide = "top" | "right" | "bottom" | "left";

export type TooltipProps = {
  /** The content shown in the tooltip bubble and bound to the trigger via `aria-describedby`. */
  readonly label: React.ReactNode;
  /** Focusable trigger element that discloses the tooltip on hover or keyboard focus. */
  readonly children: React.ReactElement;
  /** Preferred side of the trigger to render against. Defaults to "top". */
  readonly side?: TooltipSide | undefined;
  /** Offset distance in pixels from the trigger. Defaults to 6. */
  readonly sideOffset?: number | undefined;
  /** Delay in milliseconds before opening on hover. Defaults to 200. */
  readonly delay?: number | undefined;
  /** Render already open — uncontrolled, for stories and screenshots. */
  readonly defaultOpen?: boolean | undefined;
  /** Controlled open state. */
  readonly open?: boolean | undefined;
  /** Callback fired when the open state changes. */
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
  /** Additional class names applied to the tooltip content bubble. */
  readonly className?: string | undefined;
};

/**
 * A general tooltip that wraps a focusable trigger element and discloses a note on hover or focus.
 *
 * Pass a keyboard-focusable element (such as `<Button>` or `<button>`) as `children` so the
 * note is reachable by keyboard and touch. For a standalone info glyph beside passive text,
 * use {@link InfoTooltip}. Radix owns the `aria-describedby` wiring, the open-on-focus/hover
 * behaviour, and Escape-to-dismiss.
 */
export function Tooltip({
  label,
  children,
  side = "top",
  sideOffset = 6,
  delay = 200,
  defaultOpen,
  open,
  onOpenChange,
  className,
}: TooltipProps) {
  const rootProps: TooltipPrimitive.TooltipProps = {
    defaultOpen: defaultOpen ?? false,
  };
  if (open !== undefined) {
    rootProps.open = open;
  }
  if (onOpenChange !== undefined) {
    rootProps.onOpenChange = onOpenChange;
  }

  return (
    <TooltipPrimitive.Provider delayDuration={delay}>
      <TooltipPrimitive.Root {...rootProps}>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            data-slot="tooltip-content"
            side={side}
            sideOffset={sideOffset}
            className={cn(
              "z-50 max-w-64 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-lg",
              "data-[state=delayed-open]:animate-[corbits-fade-in_150ms_ease-out] data-[state=closed]:animate-[corbits-fade-out_120ms_ease-in]",
              className,
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

export type InfoTooltipProps = {
  /** The note shown in the tooltip and bound to the trigger via `aria-describedby`. */
  readonly label: string;
  /** Accessible name for the trigger button. Defaults to `label`. */
  readonly triggerLabel?: string | undefined;
  /** Render already open — uncontrolled, for stories and screenshots. */
  readonly defaultOpen?: boolean | undefined;
  readonly className?: string | undefined;
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
export function InfoTooltip({
  label,
  triggerLabel,
  defaultOpen,
  className,
}: InfoTooltipProps) {
  return (
    <Tooltip label={label} defaultOpen={defaultOpen ?? false}>
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
    </Tooltip>
  );
}
