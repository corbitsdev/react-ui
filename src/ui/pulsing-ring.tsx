import { cn } from "../lib/utils.js";

export type PulsingRingProps = {
  /** Fill token for the ring, e.g. `bg-primary-emphasis` or `bg-destructive`. */
  readonly colorClassName: string;
  readonly className?: string;
};

/**
 * A ring that scales and fades outward from its container: "this is live and
 * still changing", detached from any one marker.
 *
 * `StatusDot`'s `live` ring uses the same `corbits-status-pulse` keyframe
 * fused to its dot; this is that motion as a standalone `aria-hidden`
 * overlay for surfaces that need the pulse around something that is not a
 * dot — a phase stepper's active step, a running row's leading edge. Reduced
 * motion is handled once at the theme level (see `theme.css`), so this
 * component carries no motion-preference logic of its own.
 */
export function PulsingRing({ colorClassName, className }: PulsingRingProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute inset-0 rounded-full [animation:corbits-status-pulse_1.8s_ease-out_infinite]",
        colorClassName,
        className,
      )}
    />
  );
}
