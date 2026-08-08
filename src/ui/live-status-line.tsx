import { cn } from "../lib/utils.js";

export type LiveStatusLineProps = {
  readonly label: string;
  readonly className?: string;
};

/** The single "what's happening now" line under a stepper. A spinning ring
 * plus text, not colour alone — `motion-reduce:animate-none` stills the
 * spinner without hiding the line, since the words already carry the
 * meaning. */
export function LiveStatusLine({ label, className }: LiveStatusLineProps) {
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center gap-2 border-b border-border bg-card px-6 py-2.5 text-sm text-muted-foreground", className)}>
      <span aria-hidden className="size-3 animate-spin rounded-full border-2 border-border border-t-primary-emphasis motion-reduce:animate-none" />
      {label}…
    </div>
  );
}

export type LiveStatusSlotProps = {
  /** `null` animates the line out and renders nothing. */
  readonly label: string | null;
  readonly className?: string;
};

/**
 * Layout-stable wrapper for `LiveStatusLine`: a `null` label collapses the
 * slot's height instead of the line disappearing instantly, so the body
 * below it doesn't jump at every gate-to-processing boundary. The transition
 * is a plain CSS grid-rows trick — no animation library — and
 * `prefers-reduced-motion` disables it globally via the theme's base layer.
 */
export function LiveStatusSlot({ label, className }: LiveStatusSlotProps) {
  return (
    <div
      className={cn("grid transition-[grid-template-rows] duration-200 ease-out", label === null ? "grid-rows-[0fr]" : "grid-rows-[1fr]", className)}
    >
      <div className="overflow-hidden">{label === null ? null : <LiveStatusLine label={label} />}</div>
    </div>
  );
}
